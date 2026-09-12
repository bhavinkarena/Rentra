/**
 * Disposable-database capability probe. CREATE/DROP DATABASE cannot run through
 * Neon's `-pooler` endpoint (PgBouncer, transaction pooling), so provisioning
 * must use the direct endpoint. This proves which one works before Part 02's
 * verification depends on it.
 */
import postgres from 'postgres';

const pooled = process.env.DATABASE_URL;
const direct = pooled.replace('-pooler.', '.');
const NAME = 'rentra_part02_probe';

function open(url, db) {
  const target = db ? url.replace(/\/[^/?]+(\?|$)/, `/${db}$1`) : url;
  return postgres(target, { prepare: false, max: 1, onnotice: () => {}, connect_timeout: 20 });
}

async function step(label, run) {
  try { const value = await run(); console.log(`PASS  ${label}${value === undefined ? '' : ` -> ${value}`}`); return value; }
  catch (error) { console.log(`FAIL  ${label} -> [${error.code ?? '-'}] ${error.message}`); return null; }
}

for (const [kind, url] of [['pooled', pooled], ['direct', direct]]) {
  console.log(`\n=== ${kind} endpoint: ${url.replace(/:\/\/[^@]*@/, '://<redacted>@').split('?')[0]} ===`);
  const admin = open(url);
  await step('connect', async () => (await admin`select current_database() d`)[0].d);
  await step('list databases', async () =>
    (await admin`select datname from pg_database where not datistemplate order by 1`).map((r) => r.datname).join(', '));
  await step(`create database ${NAME}`, () => admin.unsafe(`create database ${NAME}`));
  await admin.end().catch(() => {});
}

console.log('\n=== exercise the disposable database (direct endpoint) ===');
const probe = open(direct, NAME);
await step('connect to probe db', async () => (await probe`select current_database() d`)[0].d);
await step('create extension postgis', () => probe`create extension if not exists postgis`);
await step('create extension btree_gist', () => probe`create extension if not exists btree_gist`);
await step('btree_gist version', async () =>
  (await probe`select extversion from pg_extension where extname='btree_gist'`)[0]?.extversion);
await step('create table with gist exclusion', () => probe`
  create table probe_range (
    id uuid not null,
    state text not null,
    span tstzrange not null,
    exclude using gist (id with =, span with &&) where (state = 'active')
  )`);
const LISTING = '11111111-1111-4111-8111-111111111111';
await step('insert night visit 18:00 -> 10:00 next day', () => probe`
  insert into probe_range values (${LISTING}, 'active', tstzrange('2026-10-01 18:00+05:30','2026-10-02 10:00+05:30','[)'))`);
await step('TOUCHING day visit starting exactly 10:00 must be ACCEPTED (half-open)', () => probe`
  insert into probe_range values (${LISTING}, 'active', tstzrange('2026-10-02 10:00+05:30','2026-10-02 18:00+05:30','[)'))`);
await step('OVERLAPPING visit 09:00-18:00 must be REJECTED', async () => {
  try {
    await probe`insert into probe_range values (${LISTING}, 'active', tstzrange('2026-10-02 09:00+05:30','2026-10-02 18:00+05:30','[)'))`;
    return 'ACCEPTED -- CONSTRAINT DID NOT WORK';
  } catch (error) { return `correctly rejected [${error.code}]`; }
});
await step('released row may overlap (partial constraint)', () => probe`
  insert into probe_range values (${LISTING}, 'released', tstzrange('2026-10-02 09:00+05:30','2026-10-02 18:00+05:30','[)'))`);
await probe.end().catch(() => {});

console.log('\n=== teardown ===');
const admin = open(direct);
await step(`drop database ${NAME}`, () => admin.unsafe(`drop database ${NAME} with (force)`));
await step('confirm dropped', async () =>
  (await admin`select count(*)::int n from pg_database where datname = ${NAME}`)[0].n === 0 ? 'gone' : 'STILL PRESENT');
await admin.end().catch(() => {});
