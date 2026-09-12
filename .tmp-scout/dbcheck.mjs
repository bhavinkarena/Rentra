import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  const [v] = await sql`select version() as v, current_database() as db, current_user as u`;
  console.log(v.v.split(',')[0], '|db=', v.db, '|user=', v.u);
  const ext = await sql`select name, default_version, installed_version from pg_available_extensions where name in ('postgis','btree_gist','pg_trgm') order by name`;
  console.table(ext);
  const counts = await sql`
    select 'booking' t, count(*)::int n from booking
    union all select 'availability', count(*)::int from availability
    union all select 'rentable', count(*)::int from rentable
    union all select 'rentable_price', count(*)::int from rentable_price
    union all select 'payout', count(*)::int from payout
    union all select 'review', count(*)::int from review
    union all select 'users', count(*)::int from "user"`;
  console.table(counts);
} catch (e) { console.error('ERR', e.message); }
await sql.end();
