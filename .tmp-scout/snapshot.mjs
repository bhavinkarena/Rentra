/**
 * Pre-Part-02 restore point, taken inside the database itself.
 *
 * A Neon branch would be the nicer rollback, but that is a control-plane
 * operation and needs an API key. This is the SQL equivalent: an isolated
 * `part02_backup` schema holding a byte-for-byte copy of every table the
 * migration or backfill can touch, plus the row fingerprints that let us prove
 * afterwards that legacy IDs and amounts were never mutated.
 *
 * Purely additive. It reads the public schema and writes only to part02_backup.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const TABLES = ['booking', 'payout', 'review', 'availability', 'rentable', 'rentable_price'];

const baseline = JSON.parse(readFileSync('.tmp-scout/part02-baseline.json', 'utf8'));

console.log('[snapshot] creating part02_backup schema');
await sql`create schema if not exists part02_backup`;

const result = { takenFor: 'customer part 02', tables: {}, verification: {} };

for (const table of TABLES) {
  const [existing] = await sql`
    select count(*)::int n from information_schema.tables
    where table_schema = 'part02_backup' and table_name = ${table}`;
  if (existing.n > 0) {
    console.log(`[snapshot] part02_backup.${table} already exists — leaving the original snapshot intact`);
  } else {
    await sql.unsafe(`create table part02_backup.${table} as table public.${table}`);
  }
  const [live] = await sql.unsafe(`select count(*)::int n from public.${table}`);
  const [copy] = await sql.unsafe(`select count(*)::int n from part02_backup.${table}`);
  result.tables[table] = { live: live.n, snapshot: copy.n, matches: live.n === copy.n };
  console.log(`[snapshot] ${table}: live ${live.n} -> snapshot ${copy.n} ${live.n === copy.n ? 'OK' : 'MISMATCH'}`);
}

/* Record when the snapshot was taken, using the database clock rather than a
   local one, so the restore point is self-describing. */
await sql`create table if not exists part02_backup.snapshot_meta (
  taken_at timestamptz not null default now(),
  note text not null
)`;
const [alreadyNoted] = await sql`select count(*)::int n from part02_backup.snapshot_meta`;
if (alreadyNoted.n === 0) {
  await sql`insert into part02_backup.snapshot_meta (note)
    values ('Pre-Part-02 restore point: booking/payout/review/availability/rentable/rentable_price as of before the additive reservation schema and legacy backfill.')`;
}
const meta = await sql`select taken_at, note from part02_backup.snapshot_meta order by taken_at`;
result.takenAt = meta.map((row) => row.taken_at);

/* Prove the snapshot is faithful by recomputing the baseline fingerprints
   against the COPY. Equal hashes mean the restore point is trustworthy. */
async function fingerprint(rows) {
  return createHash('sha256').update(rows.map((row) => JSON.stringify(row)).sort().join('\n')).digest('hex');
}

const checks = {
  booking: await sql`
    select id, reference, rentable_id, customer_id, to_char(day,'YYYY-MM-DD') as "day", slot, units_booked, guests,
           amount_rent, amount_fee, amount_deposit, amount_advance_paid, balance_mode, state
    from part02_backup.booking order by id`,
  payout: await sql`select id, booking_id, client_id, gross, commission, net, status from part02_backup.payout order by id`,
  review: await sql`select id, booking_id, author_id, rating, published_at from part02_backup.review order by id`,
  availability: await sql`
    select rentable_id, to_char(day,'YYYY-MM-DD') as "day", slot, units_available, price_override, blocked_by_client
    from part02_backup.availability order by rentable_id, day, slot`,
};

let ok = true;
for (const [name, rows] of Object.entries(checks)) {
  const hash = await fingerprint(rows);
  const expected = baseline.fingerprints[name].sha256;
  const matches = hash === expected;
  if (!matches) ok = false;
  result.verification[name] = { rows: rows.length, sha256: hash, matchesBaseline: matches };
  console.log(`[verify]   ${name}: ${matches ? 'identical to baseline' : 'DIFFERS FROM BASELINE'} (${rows.length} rows)`);
}

writeFileSync('.tmp-scout/part02-snapshot.json', JSON.stringify(result, null, 2));
console.log(ok
  ? '\n[snapshot] restore point is faithful. Roll back with: INSERT ... SELECT from part02_backup.<table>.'
  : '\n[snapshot] FINGERPRINT MISMATCH — do not proceed.');
await sql.end();
process.exit(ok ? 0 : 1);
