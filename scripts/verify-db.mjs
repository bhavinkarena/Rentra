import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const t = await sql`
  select table_name, (select count(*) from information_schema.columns c
    where c.table_name = t.table_name and c.table_schema='public') as cols
  from information_schema.tables t
  where table_schema='public' and table_type='BASE TABLE'
  order by table_name`;
console.log('tables:', t.length);
for (const r of t) console.log(`  ${r.table_name.padEnd(16)} ${r.cols} cols`);

const ext = await sql`select extname, extversion from pg_extension order by extname`;
console.log('\nextensions:', ext.map(e => `${e.extname}@${e.extversion}`).join(', '));

const pk = await sql`
  select tc.table_name, string_agg(kcu.column_name, ',' order by kcu.ordinal_position) cols
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
  where tc.constraint_type='PRIMARY KEY' and tc.table_schema='public'
    and tc.table_name in ('availability','rentable_price')
  group by tc.table_name`;
console.log('\ncomposite keys (the double-booking lock):');
for (const r of pk) console.log(`  ${r.table_name}(${r.cols})`);

const uq = await sql`
  select indexname, indexdef from pg_indexes
  where schemaname='public' and indexname in ('user_phone_role_idx','rentable_location_idx')`;
console.log('\nkey indexes:');
for (const r of uq) console.log(`  ${r.indexdef.replace('CREATE ','').replace(' ON public.',' ON ')}`);

await sql.end();
