/** Creates a unique disposable database; never migrates/seeds DATABASE_URL itself. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { auditLegacy, backfillLegacy } from './lib/customer-backfill.mjs';
import { planLegacyVisit } from '../lib/domain/booking-legacy.js';

const source = process.env.TEST_DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
if (!source) throw new Error('Set TEST_DATABASE_ADMIN_URL (or DATABASE_URL) to provision a disposable database');
const adminUrl = new URL(source);
// Neon transaction pooling cannot provision/drop databases reliably.
adminUrl.hostname = adminUrl.hostname.replace('-pooler.', '.');
const name = 'rentra_test_p02_' + randomUUID().replaceAll('-', '');
const targetUrl = new URL(adminUrl); targetUrl.pathname = '/' + name;
const connection = { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} };
const admin = postgres(adminUrl.href, connection);
let sql, created = false, temp;
let checks = 0;
async function check(label, action) { await action(); checks++; console.log('PASS ' + label); }
const options = { timeZone: 'Asia/Kolkata' };
const reject = (run, code) => assert.rejects(run, (error) => error.code === code);
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`); created = true;
  sql = postgres(targetUrl.href, connection);
  await sql`CREATE EXTENSION postgis`;
  await sql`CREATE EXTENSION pg_trgm`;
  temp = await mkdtemp(join(tmpdir(), 'rentra-p02-'));
  await mkdir(join(temp, 'meta'));
  const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'));
  const old = { ...journal, entries: journal.entries.filter((entry) => entry.idx < 8) };
  await writeFile(join(temp, 'meta/_journal.json'), JSON.stringify(old));
  for (const entry of old.entries) await writeFile(join(temp, entry.tag + '.sql'), await readFile('drizzle/' + entry.tag + '.sql'));
  await migrate(drizzle(sql), { migrationsFolder: temp });
  const [owner] = await sql`INSERT INTO "user" (role, email) VALUES ('client','fixture-owner@example.invalid') RETURNING id`;
  const [customer] = await sql`INSERT INTO "user" (role, phone, account_status) VALUES ('customer','9000000099','active') RETURNING id`;
  const [city] = await sql`INSERT INTO city (slug,name,state) VALUES ('fixture','Fixture','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area (city_id,slug,name) VALUES (${city.id},'fixture','Fixture') RETURNING id`;
  const [category] = await sql`INSERT INTO category (slug,name,form,default_rental_unit) VALUES ('fixture','Fixture','fixed','slot') RETURNING id`;
  const [listing] = await sql`INSERT INTO rentable (client_id,slug,public_code,title,category_id,city_id,area_id)
    VALUES (${owner.id},'fixture','fixture001','Fixture',${category.id},${city.id},${area.id}) RETURNING id`;
  const [visit] = await sql`INSERT INTO booking (reference,customer_id,rentable_id,day,slot,amount_rent,amount_fee,amount_deposit,amount_advance_paid,state)
    VALUES ('HISTORY1',${customer.id},${listing.id},'2026-10-01','night',7500,600,2000,2475,'confirmed') RETURNING *`;
  await sql`INSERT INTO review (booking_id,rentable_id,author_id,author_role,rating) VALUES (${visit.id},${listing.id},${customer.id},'customer',4)`;
  await sql`INSERT INTO payout (booking_id,client_id,gross,commission,net,status) VALUES (${visit.id},${owner.id},7500,600,6900,'paid')`;
  const original = await sql`SELECT to_jsonb(b) AS row FROM booking b`;
  const referencesBefore = await sql`SELECT (SELECT jsonb_agg(p) FROM payout p) AS payouts, (SELECT jsonb_agg(r) FROM review r) AS reviews`;
  await check('pre-migration audit is read-only and reports uncertain history', async () => {
    const report = await auditLegacy(sql, options);
    assert.equal(report.eligible, 1); assert.equal(report.unknownSettlements.length, 1);
    assert.equal(report.inventoryRemediationRequired.length, 1);
    assert.equal(report.expectedMinorTotals.amount_rent_minor, '750000');
  });
  await check('full additive migration chain and repeat migration', async () => {
    await migrate(drizzle(sql), { migrationsFolder: 'drizzle' });
    await migrate(drizzle(sql), { migrationsFolder: 'drizzle' });
    const [current] = await sql`SELECT to_jsonb(b) AS row FROM booking b`;
    for (const [key, value] of Object.entries(original[0].row)) assert.deepEqual(current.row[key], value, key);
  });
  await check('backfill once; preserve legacy IDs/rupees/review/payout; report unknown hours', async () => {
    const report = await backfillLegacy(sql, options);
    assert.equal(report.changed, 1); assert.equal(report.backfilled, 1);
    const [b] = await sql`SELECT * FROM booking`;
    assert.equal(b.id, visit.id); assert.equal(Number(b.amount_rent_minor), 750000);
    assert.equal(Number(b.legacy_advance_reported_minor), 247500);
    assert.equal(b.amount_advance_minor, null); assert.equal(Number(b.collected_minor), 0);
    assert.equal(b.hours_known, false); assert.equal(b.visit_provenance, 'legacy_unknown');
    const referencesAfter = await sql`SELECT (SELECT jsonb_agg(p) FROM payout p) AS payouts, (SELECT jsonb_agg(r) FROM review r) AS reviews`;
    // Later additive migrations may introduce columns; every original field and ID must survive.
    for (const table of ['payouts', 'reviews']) {
      assert.equal(referencesAfter[0][table].length, referencesBefore[0][table].length);
      for (const original of referencesBefore[0][table]) {
        const current = referencesAfter[0][table].find((row) => row.id === original.id);
        assert.ok(current);
        for (const [key, value] of Object.entries(original)) assert.deepEqual(current[key], value, `${table}.${key}`);
      }
    }
    for (const [key, value] of Object.entries(original[0].row)) {
      const [current] = await sql`SELECT to_jsonb(b) AS row FROM booking b`;
      assert.deepEqual(current.row[key], value, key);
    }
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation`)[0].n, 0);
  });
  await check('concurrent reruns are no-ops without double conversion', async () => {
    const other = postgres(targetUrl.href, connection);
    try {
      const reports = await Promise.all([backfillLegacy(sql, options), backfillLegacy(other, options)]);
      assert.ok(reports.every((r) => r.changed === 0));
      assert.equal((await sql`SELECT count(*)::int n FROM booking_order`)[0].n, 1);
    } finally { await other.end(); }
  });
  await check('drift in legacy values prevents repeat backfill', async () => {
    await sql`UPDATE booking SET amount_rent=7501 WHERE id=${visit.id}`;
    await assert.rejects(() => backfillLegacy(sql, options), /Audit failed/);
    await sql`UPDATE booking SET amount_rent=7500 WHERE id=${visit.id}`;
  });
  await check('seed evidence explicit; bad amounts/timezone fail closed', async () => {
    const row = original[0].row;
    assert.equal(planLegacyVisit(row, options).provenance, 'legacy_unknown');
    assert.equal(planLegacyVisit(row, { ...options, provenanceById: { [row.id]: { provenance: 'seed', evidence: 'fixture manifest' } } }).provenance, 'seed');
    assert.equal(planLegacyVisit({ ...row, amount_rent: -1 }, options).canBackfill, false);
    assert.equal(planLegacyVisit({ ...row, payment_mode: 'real' }, options).canBackfill, false);
    assert.equal(planLegacyVisit({ ...row, collected_minor: 1 }, options).canBackfill, false);
    assert.equal(planLegacyVisit(row, { timeZone: 'UTC' }).canBackfill, false);
    assert.equal(planLegacyVisit({ ...row, day: '2026-02-30' }, options).canBackfill, false);
  });
  await check('money and parent-scope constraints reject corrupt visits', async () => {
    await reject(() => sql`UPDATE booking SET collected_minor=1 WHERE id=${visit.id}`, '23514');
    await reject(() => sql`UPDATE booking SET amount_rent_minor=-1 WHERE id=${visit.id}`, '23514');
    await reject(() => sql`UPDATE booking SET currency=NULL WHERE id=${visit.id}`, '23514');
    await reject(() => sql`UPDATE booking SET customer_id=${owner.id} WHERE id=${visit.id}`, '23503');
    await reject(() => sql`UPDATE booking SET hours_known=true WHERE id=${visit.id}`, '23514');
    await reject(() => sql`UPDATE booking_order SET collected_minor=1`, '23514');
    await reject(() => sql`UPDATE booking_order SET idempotency_key=NULL`, '23502');
  });
  const reserve = (db, from, to, state = 'committed') => db`INSERT INTO inventory_reservation
    (rentable_id,source,blocked_start_at,blocked_end_at,state,released_at)
    VALUES (${listing.id},'owner_block',${from},${to},${state},${state === 'released' ? new Date().toISOString() : null})`;
  await check('GiST installed: overnight/buffer overlap rejected; touching and released allowed', async () => {
    assert.equal((await sql`SELECT count(*)::int n FROM pg_extension WHERE extname='btree_gist'`)[0].n, 1);
    await reserve(sql, '2026-10-01T18:00:00+05:30', '2026-10-02T10:00:00+05:30');
    await reserve(sql, '2026-10-02T10:00:00+05:30', '2026-10-02T18:00:00+05:30');
    await reject(() => reserve(sql, '2026-10-02T09:59:00+05:30', '2026-10-02T19:00:00+05:30'), '23P01');
    await reserve(sql, '2026-10-02T09:00:00+05:30', '2026-10-02T19:00:00+05:30', 'released');
    await reject(() => reserve(sql, '2026-10-03T18:00:00Z', '2026-10-03T10:00:00Z'), '23514');
    await reject(() => reserve(sql, '2026-10-03T10:00:00Z', '2026-10-03T18:00:00Z', 'held'), '23514');
  });
  await check('concurrent interval claims have exactly one winner', async () => {
    const other = postgres(targetUrl.href, connection);
    try {
      const results = await Promise.allSettled([sql, other].map((db) => reserve(db, '2026-11-01T10:00:00Z', '2026-11-01T18:00:00Z')));
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(results.find((r) => r.status === 'rejected').reason.code, '23P01');
    } finally { await other.end(); }
  });
  await check('existing development seed runs with explicit seed provenance', async () => {
    execFileSync(process.execPath, ['scripts/seed.mjs'], { env: { ...process.env, DATABASE_URL: targetUrl.href }, stdio: 'pipe', timeout: 120000 });
    const [count] = await sql`SELECT count(*)::int n, count(*) FILTER (WHERE visit_provenance='seed' AND payment_mode='simulated' AND collected_minor=0)::int safe FROM booking`;
    assert.ok(count.n > 0); assert.equal(count.n, count.safe);
    console.log(`Seeded ${count.n} visits in the disposable database; checking conversion and rerun`);
    const report = await backfillLegacy(sql, options);
    assert.equal(report.changed, count.n); assert.equal(report.unknownProvenance.length, 0);
    assert.equal((await backfillLegacy(sql, options)).changed, 0);
  });
  console.log(`${checks} reservation verification groups passed`);
} catch (error) {
  // Avoid logging connection objects/credentials or fixture PII on database errors.
  console.error('Reservation verification failed:', error.code, error.message);
  if (error.code?.startsWith('ERR_')) console.error(error.stack.split('\n').slice(0, 7).join('\n'));
  if (error.cause) console.error('Database cause:', error.cause.code, error.cause.message);
  if (error.stderr) console.error(String(error.stderr).slice(-2000));
  process.exitCode = 1;
} finally {
  if (sql) await sql.end();
  if (created) await admin.unsafe(`DROP DATABASE "${name}"`);
  await admin.end();
  if (temp) await rm(temp, { recursive: true, force: true });
}
