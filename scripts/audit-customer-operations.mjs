import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import postgres from 'postgres';

// Read-only configured-database pre/postflight. Never print connection strings or records.
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')).entries;
  const applied = await sql`SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  const pending = [], mismatched = [], lineEndingOnly = [];
  for (const entry of journal) {
    const row = applied.find(item => String(item.created_at) === String(entry.when));
    if (!row) pending.push(entry.tag);
    else {
      const source = readFileSync(`drizzle/${entry.tag}.sql`,'utf8');
      const hash = value => createHash('sha256').update(value).digest('hex');
      if (row.hash !== hash(source)) {
        const lf = source.replaceAll('\r\n','\n');
        if ([hash(lf),hash(lf.replaceAll('\n','\r\n'))].includes(row.hash)) lineEndingOnly.push(entry.tag);
        else mismatched.push(entry.tag);
      }
    }
  }
  // Part 05 documents the retained 0009 hash and forward repair in 0012.
  // Accept that historical difference only when both deployed bodies match 0012.
  let historicalRepairVerified = false;
  if (mismatched.includes('0009_customer_payment_ledger') && !pending.includes('0012_financial_trigger_alignment') && !mismatched.includes('0012_financial_trigger_alignment')) {
    const repair = readFileSync('drizzle/0012_financial_trigger_alignment.sql','utf8');
    const functions = [...repair.matchAll(/CREATE OR REPLACE FUNCTION (rentra_financial_\w+)\(\)[\s\S]*?AS \$\$([\s\S]*?)\$\$/g)];
    const normalize = value => value.replaceAll('\r\n','\n').trim();
    historicalRepairVerified = functions.length === 2;
    for (const [,name,body] of functions) {
      const [deployed] = await sql`SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=${name}`;
      if (!deployed || normalize(deployed.prosrc) !== normalize(body)) historicalRepairVerified = false;
    }
    if (historicalRepairVerified) mismatched.splice(mismatched.indexOf('0009_customer_payment_ledger'),1);
  }
  const report = { pending, mismatched, lineEndingOnly, historicalRepairVerified };
  if (!pending.includes('0020_customer_operations')) {
    report.tables = Array.from(await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('customer_measurement','service_health') ORDER BY table_name`).map(row => row.table_name);
    report.constraints = Array.from(await sql`SELECT conname FROM pg_constraint WHERE conname IN ('customer_measurement_bounds_chk','service_health_name_chk') ORDER BY conname`).map(row => row.conname);
    const [counts] = await sql`SELECT (SELECT count(*)::int FROM customer_measurement) measurement_buckets,(SELECT count(*)::int FROM service_health) health_rows`;
    report.counts = counts;
  }
  const [gateway] = await sql`SELECT enabled FROM payment_gateway_config ORDER BY version DESC LIMIT 1`;
  report.newCheckoutEnabled = gateway?.enabled ?? false;
  const [work] = await sql`SELECT
    (SELECT count(*)::int FROM booking_order WHERE state='held') held_orders,
    (SELECT count(*)::int FROM payment_execution e JOIN payment_order p ON p.id=e.payment_order_id WHERE e.state<>'ready' AND p.state<>'succeeded') payment_work,
    (SELECT count(*)::int FROM payment_event WHERE state<>'processed') event_work,
    (SELECT count(*)::int FROM refund WHERE state<>'succeeded') refund_work,
    (SELECT count(*)::int FROM notification_outbox WHERE state IN ('pending','retry','blocked','accepted','sending')) notification_work`;
  report.work = work;
  console.log(JSON.stringify(report, null, 2));
  if (mismatched.length || (process.argv.includes('--require-applied') && (pending.length || report.tables?.length !== 2 || report.constraints?.length !== 2))) process.exitCode = 1;
} finally { await sql.end({ timeout: 5 }); }
