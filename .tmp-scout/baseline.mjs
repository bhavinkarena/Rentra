/**
 * Pre-Part-02 baseline of the real `rentra` database, plus a capability probe
 * for the disposable-database workflow. Read-only against `rentra`; the probe
 * creates and immediately drops a throwaway database on the same endpoint.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

const report = { capturedFor: 'customer part 02', database: null, counts: {}, sums: {}, fingerprints: {}, probe: {} };

const [meta] = await sql`select current_database() db, version() v`;
report.database = { name: meta.db, version: meta.v.split(' on ')[0] };

const TABLES = ['booking', 'payout', 'review', 'availability', 'rentable', 'rentable_price', 'unit', 'person'];
for (const table of TABLES) {
  const [row] = await sql`select count(*)::int n from ${sql(table)}`;
  report.counts[table] = row.n;
}

const [money] = await sql`
  select sum(amount_rent)::bigint rent, sum(amount_fee)::bigint fee,
         sum(amount_deposit)::bigint deposit, sum(amount_advance_paid)::bigint advance,
         count(*) filter (where starts_at is null)::int unknown_start,
         count(*) filter (where ends_at is null)::int unknown_end,
         count(distinct id)::int distinct_ids, count(distinct reference)::int distinct_refs
  from booking`;
report.sums.bookingWholeRupees = {
  rent: Number(money.rent), fee: Number(money.fee),
  deposit: Number(money.deposit), advancePaid: Number(money.advance),
};
report.sums.bookingMinorUnitsExpected = Object.fromEntries(
  Object.entries(report.sums.bookingWholeRupees).map(([key, value]) => [key, value * 100]));
report.sums.unknownHours = { startsAtNull: money.unknown_start, endsAtNull: money.unknown_end };
report.sums.identity = { distinctIds: money.distinct_ids, distinctReferences: money.distinct_refs };

const [payoutSums] = await sql`select sum(gross)::bigint gross, sum(net)::bigint net, sum(commission)::bigint commission from payout`;
report.sums.payoutWholeRupees = { gross: Number(payoutSums.gross), net: Number(payoutSums.net), commission: Number(payoutSums.commission) };

/* A stable fingerprint of every legacy row, so "IDs and amounts unchanged" is
   provable after the backfill rather than asserted. */
async function fingerprint(name, rows) {
  const canonical = rows.map((row) => JSON.stringify(row)).sort().join('\n');
  report.fingerprints[name] = { rows: rows.length, sha256: createHash('sha256').update(canonical).digest('hex') };
}

await fingerprint('booking', await sql`
  select id, reference, rentable_id, customer_id, to_char(day,'YYYY-MM-DD') as "day", slot, units_booked, guests,
         amount_rent, amount_fee, amount_deposit, amount_advance_paid, balance_mode, state
  from booking order by id`);
await fingerprint('payout', await sql`select id, booking_id, client_id, gross, commission, net, status from payout order by id`);
await fingerprint('review', await sql`select id, booking_id, author_id, rating, published_at from review order by id`);
await fingerprint('availability', await sql`
  select rentable_id, to_char(day,'YYYY-MM-DD') as "day", slot, units_available, price_override, blocked_by_client
  from availability order by rentable_id, day, slot`);

/* Capability probe: can this role provision a disposable database, and does
   btree_gist install there? Both are Part 02 verification prerequisites. */
const probeName = 'rentra_part02_probe';
try {
  await sql.unsafe(`drop database if exists ${probeName}`);
  await sql.unsafe(`create database ${probeName}`);
  const probeUrl = url.replace(/\/rentra(\?|$)/, `/${probeName}$1`);
  const probe = postgres(probeUrl, { prepare: false, max: 1, onnotice: () => {} });
  await probe`create extension if not exists btree_gist`;
  const [ext] = await probe`select extversion from pg_extension where extname = 'btree_gist'`;
  await probe`create table probe_range (id uuid not null, span tstzrange not null,
      exclude using gist (id with =, span with &&))`;
  await probe`insert into probe_range values ('11111111-1111-4111-8111-111111111111', tstzrange('2026-10-01 09:00+05:30','2026-10-01 18:00+05:30','[)'))`;
  let touching = 'REJECTED';
  try {
    await probe`insert into probe_range values ('11111111-1111-4111-8111-111111111111', tstzrange('2026-10-01 18:00+05:30','2026-10-02 10:00+05:30','[)'))`;
    touching = 'ACCEPTED';
  } catch (error) { touching = `REJECTED (${error.code})`; }
  let overlapping = 'ACCEPTED';
  try {
    await probe`insert into probe_range values ('11111111-1111-4111-8111-111111111111', tstzrange('2026-10-01 17:00+05:30','2026-10-01 20:00+05:30','[)'))`;
  } catch (error) { overlapping = `REJECTED (${error.code})`; }
  report.probe = {
    canCreateDatabase: true, btreeGistVersion: ext?.extversion ?? null,
    exclusionConstraintCreated: true,
    touchingIntervalsHalfOpen: touching, overlappingIntervals: overlapping,
  };
  await probe.end();
  await sql.unsafe(`drop database ${probeName}`);
  report.probe.probeDatabaseDropped = true;
} catch (error) {
  report.probe = { error: error.message, code: error.code };
}

writeFileSync('.tmp-scout/part02-baseline.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await sql.end();
