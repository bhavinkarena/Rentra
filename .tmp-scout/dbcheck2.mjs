import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  const [r] = await sql`select rolcreatedb, rolsuper, rolcreaterole from pg_roles where rolname = current_user`;
  console.log('role caps:', r);
  const dbs = await sql`select datname from pg_database order by 1`;
  console.log('databases:', dbs.map(d => d.datname).join(', '));
  console.log('--- booking sample ---');
  const b = await sql`select id, reference, day, slot, starts_at, ends_at, units_booked, guests, amount_rent, amount_fee, amount_deposit, amount_advance_paid, balance_mode, state, contact_phone is not null as has_phone, created_at from booking order by created_at limit 5`;
  console.table(b);
  console.log('--- booking aggregates ---');
  const agg = await sql`select state, slot, count(*)::int n, sum(amount_rent)::bigint rent, sum(amount_fee)::bigint fee, sum(amount_deposit)::bigint dep, sum(amount_advance_paid)::bigint adv,
    count(*) filter (where starts_at is null)::int null_starts, count(*) filter (where ends_at is null)::int null_ends
    from booking group by 1,2 order by 1,2`;
  console.table(agg);
  console.log('--- distinct balance_mode / units ---');
  console.table(await sql`select balance_mode, count(*)::int n, min(units_booked)::int minu, max(units_booked)::int maxu, min(guests)::int ming, max(guests)::int maxg from booking group by 1`);
  console.log('--- rentable timezone-ish fields ---');
  console.table(await sql`select id, title, total_units, capacity, check_in_from, check_out_by, deposit_amount, cancellation_tier, status from rentable order by title limit 6`);
  console.log('--- rentable_price sample ---');
  console.table(await sql`select rentable_id, slot, weekday, weekend from rentable_price order by rentable_id limit 6`);
  console.log('--- availability shape ---');
  console.table(await sql`select slot, count(*)::int n, count(*) filter (where blocked_by_client)::int blocked, count(*) filter (where price_override is not null)::int overrides, min(day) mind, max(day) maxd from availability group by 1`);
  console.log('--- payout/review linkage ---');
  console.table(await sql`select (select count(*)::int from payout p join booking b on b.id=p.booking_id) payout_linked, (select count(*)::int from review r join booking b on b.id=r.booking_id) review_linked`);
} catch (e) { console.error('ERR', e.message); }
await sql.end();
