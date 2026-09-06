import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

console.log('=== listings as the search page will show them ===');
const rows = await sql`
  select r.title, a.name area, r.bedrooms bd, r.capacity cap,
         r.farm_size || ' ' || r.farm_size_unit size, coalesce(r.pool_size,'—') pool,
         p_day.weekday d_wd, p_day.weekend d_we,
         p_full.weekday f_wd, p_full.weekend f_we,
         r.deposit_amount dep, r.cancellation_tier tier,
         coalesce(r.rating_avg::text,'—') rating, r.review_count rc,
         case when r.verified_at is null then 'no' else 'YES' end verified
  from rentable r
  join area a on a.id = r.area_id
  left join rentable_price p_day  on p_day.rentable_id = r.id  and p_day.slot='day'
  left join rentable_price p_full on p_full.rentable_id = r.id and p_full.slot='full_day'
  where r.status='live'
  order by r.verified_at desc nulls last, r.rating_avg desc nulls last`;

console.log('area      bd cap  size      pool   12hr wd/we    24hr wd/we    dep   tier      ★    rv  ver');
for (const r of rows) {
  console.log(
    r.area.padEnd(10) + String(r.bd).padEnd(3) + String(r.cap).padEnd(5)
    + r.size.padEnd(10) + r.pool.padEnd(7)
    + `${r.d_wd}/${r.d_we}`.padEnd(14) + `${r.f_wd}/${r.f_we}`.padEnd(14)
    + String(r.dep).padEnd(6) + r.tier.padEnd(10)
    + String(r.rating).padEnd(5) + String(r.rc).padEnd(4) + r.verified,
  );
}

console.log('\n=== denormalised rating_avg vs actual reviews (must match) ===');
const chk = await sql`
  select r.slug, r.rating_avg stored, r.review_count stored_n,
         round(avg(v.rating)::numeric,1) actual, count(v.id)::int actual_n
  from rentable r left join review v on v.rentable_id = r.id
  group by r.id, r.slug, r.rating_avg, r.review_count
  order by r.slug`;
let bad = 0;
for (const c of chk) {
  const okN = c.stored_n === c.actual_n;
  const okR = (c.stored === null && c.actual === null)
    || (c.stored !== null && c.actual !== null && Math.abs(Number(c.stored) - Number(c.actual)) < 0.06);
  if (!okN || !okR) { bad++; console.log(`  MISMATCH ${c.slug}: stored ${c.stored}/${c.stored_n} vs actual ${c.actual}/${c.actual_n}`); }
}
console.log(bad === 0 ? `  all ${chk.length} listings consistent` : `  ${bad} mismatched`);

console.log('\n=== the client that owns everything ===');
const cl = await sql`
  select u.email, u.phone, u.role, u.client_type, u.kyc_status,
         u.response_rate, u.responds_within_mins,
         (select count(*) from rentable where client_id=u.id)::int listings
  from "user" u where u.email='client@gmail.com' order by u.role`;
for (const c of cl) {
  console.log(`  ${c.role.padEnd(9)} ${c.phone}  ${c.email}  kyc=${c.kyc_status}  listings=${c.listings}`
    + (c.role === 'client' ? `  ${Math.round(c.response_rate*100)}% / under ${Math.round(c.responds_within_mins/60)}h` : ''));
}

console.log('\n=== availability + thin-page guard per area ===');
const av = await sql`
  select a.slug, count(distinct r.id)::int listings,
         sum(case when av.units_available>0 then 1 else 0 end)::int open,
         sum(case when av.units_available=0 then 1 else 0 end)::int blocked
  from area a join rentable r on r.area_id=a.id
  join availability av on av.rentable_id=r.id
  group by a.slug order by a.slug`;
for (const r of av) {
  const guard = r.listings >= 3 ? 'index' : 'NOINDEX (thin)';
  console.log(`  ${r.slug.padEnd(10)} listings=${r.listings}  open=${String(r.open).padStart(4)} blocked=${String(r.blocked).padStart(3)}  → ${guard}`);
}
await sql.end();
