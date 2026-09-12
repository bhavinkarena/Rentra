/**
 * Pre-migration drift check. If the live database already disagrees with
 * drizzle/meta/0007_snapshot.json, the Part 02 migration would silently carry
 * unrelated changes. Verify the starting point is clean first.
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const snapshot = JSON.parse(readFileSync('drizzle/meta/0007_snapshot.json', 'utf8'));

const declared = new Map();
for (const [key, table] of Object.entries(snapshot.tables)) {
  const name = table.name ?? key.split('.').pop();
  declared.set(name, new Set(Object.values(table.columns).map((column) => column.name)));
}

const liveRows = await sql`
  select table_name, column_name from information_schema.columns
  where table_schema = 'public' order by table_name, column_name`;
const live = new Map();
for (const row of liveRows) {
  if (!live.has(row.table_name)) live.set(row.table_name, new Set());
  live.get(row.table_name).add(row.column_name);
}

const IGNORE = new Set(['spatial_ref_sys', '__drizzle_migrations']);
const problems = [];

for (const [table, columns] of declared) {
  if (!live.has(table)) { problems.push(`table declared but missing in database: ${table}`); continue; }
  for (const column of columns) {
    if (!live.get(table).has(column)) problems.push(`${table}.${column} declared but missing in database`);
  }
}
for (const [table, columns] of live) {
  if (IGNORE.has(table)) continue;
  if (!declared.has(table)) { problems.push(`table in database but not declared: ${table}`); continue; }
  for (const column of columns) {
    if (!declared.get(table).has(column)) problems.push(`${table}.${column} in database but not declared`);
  }
}

const applied = await sql`select count(*)::int n from drizzle.__drizzle_migrations`.catch(() => [{ n: null }]);
const [{ n: appliedCount }] = applied;
const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));

const otherSchemas = await sql`
  select schema_name from information_schema.schemata
  where schema_name not in ('public','information_schema','pg_catalog','pg_toast','drizzle') order by 1`;

console.log(`declared tables: ${declared.size} · live public tables: ${live.size - [...live.keys()].filter((t) => IGNORE.has(t)).length}`);
console.log(`migrations in journal: ${journal.entries.length} · applied in database: ${appliedCount}`);
console.log(`non-public schemas present: ${otherSchemas.map((r) => r.schema_name).join(', ') || 'none'}`);
console.log(problems.length ? `\nDRIFT (${problems.length}):\n- ${problems.join('\n- ')}` : '\nNo drift: the database matches snapshot 0007 exactly.');

await sql.end();
process.exit(problems.length ? 1 : 0);
