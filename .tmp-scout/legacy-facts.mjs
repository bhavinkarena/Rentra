/** Read-only fact-finding over the 44 legacy bookings, for Part 02's audit taxonomy. */
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const show = (title, rows) => { console.log(`\n### ${title}`); console.table(rows.length ? rows : [{ result: 'none' }]); };

show('guests above listing capacity', await sql`
  select b.reference, b.guests, r.capacity, b.guests - r.capacity as over, r.title
  from booking b join rentable r on r.id = b.rentable_id
  where b.guests > r.capacity order by over desc limit 12`);

show('guests-above-capacity summary', await sql`
  select count(*)::int affected, max(b.guests - r.capacity)::int worst_excess
  from booking b join rentable r on r.id = b.rentable_id where b.guests > r.capacity`);

show('same listing + day + slot booked more than once', await sql`
  select rentable_id, to_char(day,'YYYY-MM-DD') as "d", slot, count(*)::int n
  from booking group by 1,2,3 having count(*) > 1 limit 10`);

show('day+night pair on the same listing/date (a latent full-day overlap)', await sql`
  select a.rentable_id, to_char(a.day,'YYYY-MM-DD') as "d", a.reference ref_day, b2.reference ref_night
  from booking a join booking b2
    on b2.rentable_id = a.rentable_id and b2.day = a.day and a.slot='day' and b2.slot='night' limit 10`);

show('listing status behind each legacy booking', await sql`
  select r.status, count(*)::int bookings from booking b join rentable r on r.id=b.rentable_id group by 1`);

show('booking dates vs the availability window (2026-09-06..2026-12-10)', await sql`
  select count(*) filter (where day < '2026-09-06')::int before_window,
         count(*) filter (where day between '2026-09-06' and '2026-12-10')::int inside_window,
         count(*) filter (where day > '2026-12-10')::int after_window,
         count(*) filter (where day < current_date)::int in_the_past
  from booking`);

show('legacy booking rows that have a matching availability row', await sql`
  select count(*)::int total,
         count(a.rentable_id)::int with_availability_row,
         count(*) filter (where a.blocked_by_client)::int on_a_blocked_row,
         count(*) filter (where a.units_available > 0)::int still_shows_units_free
  from booking b
  left join availability a on a.rentable_id=b.rentable_id and a.day=b.day and a.slot::text=b.slot::text`);

show('does a price row exist for every booked listing+slot, and does it match?', await sql`
  select count(*)::int bookings, count(p.rentable_id)::int with_price_row,
         count(*) filter (where b.amount_rent not in (p.weekday, p.weekend))::int rent_matches_neither_band
  from booking b left join rentable_price p on p.rentable_id=b.rentable_id and p.slot=b.slot`);

show('customer identity behind legacy bookings', await sql`
  select u.role, u.account_status, count(*)::int bookings
  from booking b join "user" u on u.id=b.customer_id group by 1,2`);

show('fee reconciles to the 8% platform fee?', await sql`
  select count(*) filter (where amount_fee = round(amount_rent * 0.08))::int matches_8pct,
         count(*) filter (where amount_fee <> round(amount_rent * 0.08))::int does_not,
         count(*)::int total from booking`);

show('advance = 25% rent + full fee (the illustrative rule)?', await sql`
  select count(*) filter (where amount_advance_paid = round(amount_rent*0.25) + amount_fee)::int matches_rule,
         count(*) filter (where amount_advance_paid <> round(amount_rent*0.25) + amount_fee)::int does_not,
         count(*) filter (where amount_advance_paid > 0)::int nonzero_advance from booking`);

show('payout status distribution (is any seeded money marked paid?)', await sql`
  select status, count(*)::int n, sum(net)::bigint net_rupees from payout group by 1`);

show('check_in_from / check_out_by distinct values (are any machine-parseable?)', await sql`
  select check_in_from, check_out_by, count(*)::int listings from rentable group by 1,2`);

show('slot coverage in rentable_price vs slots actually booked', await sql`
  select slot, count(*)::int price_rows from rentable_price group by 1
  union all select 'BOOKED:'||slot::text, count(*)::int from booking group by slot`);

await sql.end();
