import postgres from 'postgres';
const pooled = process.env.DATABASE_URL;
const direct = pooled.replace('-pooler.', '.');
const NAME = 'rentra_part02_probe';
const open = (url, db) => postgres(db ? url.replace(/\/[^/?]+(\?|$)/, `/${db}$1`) : url,
  { prepare: false, max: 1, onnotice: () => {}, connect_timeout: 20 });
let fails = 0;
async function expect(label, run, wantCode) {
  try {
    const v = await run();
    if (wantCode) { console.log(`FAIL  ${label} -> expected error ${wantCode}, got success`); fails++; return v; }
    console.log(`PASS  ${label}${v === undefined ? '' : ` -> ${v}`}`); return v;
  } catch (e) {
    if (wantCode && e.code === wantCode) { console.log(`PASS  ${label} -> rejected with ${e.code}`); return null; }
    console.log(`FAIL  ${label} -> [${e.code ?? '-'}] ${e.message}`); fails++; return null;
  }
}
const admin = open(direct);
await expect('provision disposable database', () => admin.unsafe(`create database ${NAME}`));
const p = open(direct, NAME);
await expect('extension btree_gist', () => p`create extension if not exists btree_gist`);
await expect('reservation ledger with partial gist exclusion', () => p.unsafe(`
  create table probe_res (
    id uuid primary key default gen_random_uuid(),
    rentable_id uuid not null,
    state text not null,
    occupied tstzrange not null,
    exclude using gist (rentable_id with =, occupied with &&) where (state in ('held','confirmed'))
  )`));
const L = '11111111-1111-4111-8111-111111111111';
const ins = (state, a, b) => p.unsafe(
  `insert into probe_res (rentable_id, state, occupied) values ($1,$2,tstzrange($3,$4,'[)'))`, [L, state, a, b]);
await expect('night visit 18:00 -> 10:00 next day held', () => ins('held', '2026-10-01 18:00+05:30', '2026-10-02 10:00+05:30'));
await expect('TOUCHING day visit starting exactly 10:00 accepted (half-open)', () => ins('held', '2026-10-02 10:00+05:30', '2026-10-02 18:00+05:30'));
await expect('OVERLAPPING 09:00-18:00 rejected by exclusion', () => ins('held', '2026-10-02 09:00+05:30', '2026-10-02 18:00+05:30'), '23P01');
await expect('released row may overlap (partial predicate)', () => ins('released', '2026-10-02 09:00+05:30', '2026-10-02 18:00+05:30'));
await expect('different listing may overlap', () => p.unsafe(
  `insert into probe_res (rentable_id, state, occupied) values ($1,'held',tstzrange($2,$3,'[)'))`,
  ['22222222-2222-4222-8222-222222222222', '2026-10-02 09:00+05:30', '2026-10-02 18:00+05:30']));
await expect('row count', async () => (await p`select count(*)::int n from probe_res`)[0].n);
await p.end().catch(() => {});
await expect('drop disposable database with force', () => admin.unsafe(`drop database ${NAME} with (force)`));
await expect('confirm gone', async () => (await admin`select count(*)::int n from pg_database where datname=${NAME}`)[0].n === 0 ? 'gone' : 'STILL PRESENT');
await admin.end().catch(() => {});
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PROBE ASSERTIONS PASSED');
process.exit(fails ? 1 : 0);
