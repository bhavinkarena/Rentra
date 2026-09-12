import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import postgres from 'postgres';
import { auditLegacy, backfillLegacy } from './lib/customer-backfill.mjs';

const { values } = parseArgs({ options: {
  apply: { type: 'boolean', default: false },
  'database-name': { type: 'string' },
  'time-zone': { type: 'string' },
  'provenance-file': { type: 'string' },
} });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
try {
  const [{ name }] = await sql`SELECT current_database() AS name`;
  const options = { timeZone: values['time-zone'], provenanceById: values['provenance-file']
    ? JSON.parse(await readFile(values['provenance-file'], 'utf8')) : {} };
  if (values.apply && values['database-name'] !== name) throw new Error('Apply requires --database-name matching the connected database');
  const result = values.apply ? await backfillLegacy(sql, options)
    : await sql.begin('read only', (tx) => auditLegacy(tx, options));
  console.log(JSON.stringify({ mode: values.apply ? 'apply' : 'dry-run', ...result }, null, 2));
  if (result.invalid.length || result.mismatchedOrders.length) process.exitCode = 1;
} catch (error) {
  console.error('Legacy audit/backfill failed:', error.code ?? error.message);
  process.exitCode = 1;
} finally { await sql.end(); }
