/** Provision only a uniquely named test database; never migrate the source DB. */
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

export async function withDisposableDatabase(label, run) {
  if (!/^[a-z0-9_]{1,24}$/.test(label)) throw new Error('Invalid disposable database label');
  const source = process.env.TEST_DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!source) throw new Error('Set TEST_DATABASE_ADMIN_URL or DATABASE_URL to provision a disposable test database');
  const adminUrl = new URL(source);
  adminUrl.hostname = adminUrl.hostname.replace('-pooler.', '.');
  const name = `rentra_test_${label}_${randomUUID().replaceAll('-', '')}`;
  const targetUrl = new URL(adminUrl);
  targetUrl.pathname = `/${name}`;
  const options = { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} };
  const admin = postgres(adminUrl.href, options);
  const clients = [];
  let created = false;
  const connect = () => {
    const client = postgres(targetUrl.href, options);
    // Production wraps every raw client with Drizzle, which sets JSON/date serializers.
    // Contending test connections must use that same wire representation.
    drizzle(client);
    clients.push(client);
    return client;
  };
  try {
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    created = true;
    const sql = connect();
    await sql`CREATE EXTENSION postgis`;
    await sql`CREATE EXTENSION pg_trgm`;
    await migrate(drizzle(sql), { migrationsFolder: 'drizzle' });
    return await run({ sql, connect, databaseUrl: targetUrl.href });
  } finally {
    await Promise.all(clients.map((client) => client.end({ timeout: 5 })));
    try {
      // Only a database successfully created by this call can be removed.
      if (created) await admin.unsafe(`DROP DATABASE "${name}"`);
    } finally {
      await admin.end({ timeout: 5 });
    }
  }
}
