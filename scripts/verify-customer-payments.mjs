/** Synthetic financial fixtures in a uniquely owned disposable DB. No provider calls. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { ownerFinancialSummary, ownerPayoutSources } from '../lib/payments/accounting.js';
import { customerPaymentMethods } from '../lib/payments/customer-methods.js';
import { PAYMENT_RUNTIME } from '../lib/payments/config.js';
import { POST as webhook } from '../app/api/webhooks/razorpay/route.js';

const source = process.env.TEST_DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
if (!source) throw new Error('A database provisioner URL is required');
const adminUrl = new URL(source); adminUrl.hostname = adminUrl.hostname.replace('-pooler.', '.');
const name = 'rentra_test_p03_' + randomUUID().replaceAll('-', '');
const targetUrl = new URL(adminUrl); targetUrl.pathname = '/' + name;
const options = { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} };
const admin = postgres(adminUrl.href, options);
let sql, created = false, temp, owner, customer, otherOwner, otherCustomer, listing;
let passed = 0;
const hash = 'a'.repeat(64);
const now = () => new Date().toISOString();
const reject = (run, code='23514') => assert.rejects(run, (e) => (e.code ?? e.cause?.code) === code);
async function check(label, action) { await action(); passed++; console.log('PASS ' + label); }

async function flow({ mode='real', environment='live', provenance='real', paymentId=randomUUID() } = {}) {
  return sql.begin(async (db) => {
    const provider = mode === 'simulated' ? 'dummy' : 'fixture_provider';
    const [bo] = await db`INSERT INTO booking_order (reference,customer_id,rentable_id,state,currency,time_zone,
      pricing_version,policy_version,policy_snapshot,listing_snapshot,amount_rent_minor,amount_fee_minor,amount_deposit_minor,
      payment_mode,visit_provenance,idempotency_key,request_hash)
      VALUES (${randomUUID()},${customer.id},${listing.id},'completed','INR','Asia/Kolkata','fixture','fixture','{}','{}',10000,800,0,
        ${mode},${provenance},${randomUUID()},${hash}) RETURNING id`;
    const [b] = await db`INSERT INTO booking (reference,customer_id,rentable_id,day,slot,amount_rent,amount_fee,state,order_id,
      item_position,local_day,currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,payment_mode,visit_provenance)
      VALUES (${randomUUID().slice(0,16)},${customer.id},${listing.id},'2026-10-01','day',100,8,'completed',${bo.id},
        1,'2026-10-01','INR','Asia/Kolkata',10000,800,0,${mode},${provenance}) RETURNING id`;
    const [po] = await db`INSERT INTO payment_order (booking_order_id,provider,environment,mode,currency,purpose,expected_minor,idempotency_key,request_hash)
      VALUES (${bo.id},${provider},${environment},${mode},'INR','full',10800,${randomUUID()},${hash}) RETURNING id`;
    const external = mode === 'real' ? paymentId : null;
    const [a] = await db`INSERT INTO payment_attempt (payment_order_id,provider,environment,mode,currency,attempt_number,
      provider_payment_id,expected_minor,state) VALUES (${po.id},${provider},${environment},${mode},'INR',1,${external},10800,'succeeded') RETURNING id`;
    return { bo:bo.id, b:b.id, po:po.id, a:a.id, mode, environment, provider, paymentId:external };
  });
}
async function fact(db, f, { kind=f.mode === 'simulated' ? 'simulated' : 'capture', amount=10800,
  ledger=randomUUID(), allocate=true } = {}) {
  const [t] = await db`INSERT INTO payment_transaction (attempt_id,reference,provider,environment,mode,currency,
    provider_payment_id,external_ledger_id,kind,outcome,expected_minor,simulated_minor,authorized_minor,captured_minor,verified_at,evidence_hash)
    VALUES (${f.a},${(f.mode==='simulated'?'DUMMY_TXN_':'TXN_')+randomUUID()},${f.provider},${f.environment},${f.mode},'INR',
      ${f.paymentId},${ledger},${kind},'succeeded',10800,${String(kind==='simulated'?amount:0)},
      ${String(kind==='authorization'?amount:0)},${String(kind==='capture'?amount:0)},${now()},${hash}) RETURNING id`;
  const allocations = [];
  if (allocate && ['capture','simulated'].includes(kind)) {
    for (const [component, value] of [['rent', Math.max(0,amount-800)],['fee', Math.min(800,amount)]]) {
      const [pa] = await db`INSERT INTO payment_allocation (transaction_id,booking_id,component,actual_minor,simulated_minor)
        VALUES (${t.id},${f.b},${component},${String(kind==='capture'?value:0)},${String(kind==='simulated'?value:0)}) RETURNING id`;
      allocations.push({id:pa.id, component, value});
    }
  }
  return { ...f, t:t.id, allocations, ledger };
}
async function refundFact(db, f, amount, state='requested') {
  const actual = f.mode === 'real' && state === 'succeeded' ? amount : 0;
  const [r] = await db`INSERT INTO refund (transaction_id,reference,provider,environment,mode,currency,expected_minor,actual_minor,
    reason,idempotency_key,request_hash,state,provider_refund_id,verified_at,evidence_hash)
    VALUES (${f.t},${'RF_'+randomUUID()},${f.provider},${f.environment},${f.mode},'INR',${String(amount)},${String(actual)},
      'fixture cancellation',${randomUUID()},${hash},${state},${state==='succeeded'?randomUUID():null},${state==='succeeded'?now():null},${state==='succeeded'?hash:null}) RETURNING id`;
  const [ra] = await db`INSERT INTO refund_allocation (refund_id,payment_allocation_id,booking_id,component,expected_minor,actual_minor)
    VALUES (${r.id},${f.allocations[0].id},${f.b},'rent',${String(amount)},${String(actual)}) RETURNING id`;
  return { id:r.id, allocationId:ra.id };
}
try {
  console.log('Provisioning disposable payment database and applying baseline migrations');
  await admin.unsafe(`CREATE DATABASE "${name}"`); created=true;
  sql = postgres(targetUrl.href, options);
  await sql`CREATE EXTENSION postgis`; await sql`CREATE EXTENSION pg_trgm`;
  temp=await mkdtemp(join(tmpdir(),'rentra-p03-')); await mkdir(join(temp,'meta'));
  const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
  const old={...journal,entries:journal.entries.filter((e)=>e.idx<9)};
  await writeFile(join(temp,'meta/_journal.json'),JSON.stringify(old));
  for (const e of old.entries) await writeFile(join(temp,e.tag+'.sql'),await readFile('drizzle/'+e.tag+'.sql'));
  await migrate(drizzle(sql),{migrationsFolder:temp});
  [owner]=await sql`INSERT INTO "user" (role,email,account_status) VALUES ('client','owner@fixture.invalid','active') RETURNING id`;
  [otherOwner]=await sql`INSERT INTO "user" (role,email,account_status) VALUES ('client','other@fixture.invalid','active') RETURNING id`;
  [customer]=await sql`INSERT INTO "user" (role,phone,account_status) VALUES ('customer','9000000091','active') RETURNING id`;
  [otherCustomer]=await sql`INSERT INTO "user" (role,phone,account_status) VALUES ('customer','9000000092','active') RETURNING id`;
  const [city]=await sql`INSERT INTO city (slug,name,state) VALUES ('fixture','Fixture','Gujarat') RETURNING id`;
  const [area]=await sql`INSERT INTO area (city_id,slug,name) VALUES (${city.id},'fixture','Fixture') RETURNING id`;
  const [category]=await sql`INSERT INTO category (slug,name,form,default_rental_unit) VALUES ('fixture','Fixture','fixed','slot') RETURNING id`;
  [listing]=await sql`INSERT INTO rentable (client_id,slug,public_code,title,category_id,city_id,area_id)
    VALUES (${owner.id},'fixture','fixture001','Fixture',${category.id},${city.id},${area.id}) RETURNING id`;
  const [legacy]=await sql`INSERT INTO booking (reference,customer_id,rentable_id,day,slot,amount_rent,amount_fee,amount_advance_paid,state)
    VALUES ('LEGACY',${customer.id},${listing.id},'2026-01-01','day',100,8,108,'completed') RETURNING id`;
  const [legacyPayout]=await sql`INSERT INTO payout (booking_id,client_id,gross,commission,net,status)
    VALUES (${legacy.id},${owner.id},100,8,92,'paid') RETURNING *`;
  await check('additive migration, repeatability and intact legacy payouts',async()=>{
    await migrate(drizzle(sql),{migrationsFolder:'drizzle'});
    await migrate(drizzle(sql),{migrationsFolder:'drizzle'});
    const [p]=await sql`SELECT * FROM payout WHERE id=${legacyPayout.id}`;
    for(const [key,value] of Object.entries(legacyPayout)) assert.deepEqual(p[key],value,key);
    assert.equal(String(p.actual_net_minor),'0'); assert.equal(p.funding_allocation_id,null);
  });
  await check('dummy runtime and webhook cannot enable real payments',async()=>{
    assert.equal(PAYMENT_RUNTIME.realPaymentsEnabled,false); assert.equal(PAYMENT_RUNTIME.mode,'simulated');
    const response=await webhook(); assert.equal(response.status,503); assert.equal((await response.json()).code,'PAYMENTS_DISABLED');
  });
  const sim=await flow({mode:'simulated',environment:'simulated',provenance:'seed'});
  const simFact=await sql.begin((db)=>fact(db,sim));
  await check('simulated captures/refunds and legacy paid rows produce zero actual funds',async()=>{
    await sql.begin((db)=>refundFact(db,simFact,500,'succeeded'));
    const summary=await ownerFinancialSummary(sql,owner.id);
    assert.equal(summary.captured_minor,'0'); assert.equal(summary.available_rent_minor,'0');
    assert.deepEqual(await ownerPayoutSources(sql,owner.id),[]);
    await reject(()=>sql`UPDATE payment_transaction SET captured_minor=1 WHERE id=${simFact.t}`);
    await reject(()=>sql.begin((db)=>fact(db,sim,{kind:'capture'})));
    await reject(()=>sql`UPDATE booking_order SET payment_mode='real' WHERE id=${sim.bo}`);
    await reject(()=>sql`UPDATE booking SET visit_provenance='real' WHERE id=${sim.b}`);
    await reject(()=>sql`UPDATE refund SET actual_minor=1 WHERE transaction_id=${simFact.t}`);
  });
  const real=await flow();
  const authorization=await sql.begin((db)=>fact(db,real,{kind:'authorization'}));
  let captured;
  await check('authorization and capture share payment identity without double counting',async()=>{
    assert.equal((await ownerFinancialSummary(sql,owner.id)).captured_minor,'0');
    captured=await sql.begin((db)=>fact(db,real,{ledger:authorization.ledger}));
    const summary=await ownerFinancialSummary(sql,owner.id);
    assert.equal(summary.captured_minor,'10800'); assert.equal(summary.net_captured_fee_minor,'800');
    assert.equal(summary.available_rent_minor,'10000');
    await reject(()=>sql.begin((db)=>fact(db,real,{ledger:authorization.ledger})),'23505');
    await reject(()=>sql`DELETE FROM payment_transaction WHERE id=${captured.t}`);
    await reject(()=>sql`UPDATE payment_allocation SET actual_minor=0 WHERE id=${captured.allocations[0].id}`);
  });
  await check('test namespace and seed/unknown provenance never contribute real revenue',async()=>{
    for(const cfg of [{environment:'test',paymentId:real.paymentId},{provenance:'seed'},{provenance:'legacy_unknown'}]) {
      const f=await flow(cfg); await sql.begin((db)=>fact(db,f));
    }
    assert.equal((await ownerFinancialSummary(sql,owner.id)).captured_minor,'10800');
    assert.equal((await ownerFinancialSummary(sql,otherOwner.id)).captured_minor,'0');
    assert.equal(await ownerFinancialSummary(sql,customer.id),null);
    await sql`UPDATE "user" SET account_status='suspended' WHERE id=${owner.id}`;
    assert.equal(await ownerFinancialSummary(sql,owner.id),null);
    assert.deepEqual(await ownerPayoutSources(sql,owner.id),[]);
    await sql`UPDATE "user" SET account_status='active' WHERE id=${owner.id}`;
  });
  await check('invalid amounts, scope changes, duplicate active attempts and incomplete allocations fail',async()=>{
    await reject(()=>sql`UPDATE payment_order SET expected_minor=-1 WHERE id=${real.po}`);
    await reject(()=>sql`UPDATE payment_attempt SET environment='test' WHERE id=${real.a}`);
    await reject(()=>sql`UPDATE payment_order SET provider='dummy' WHERE id=${real.po}`);
    const empty=await flow();
    await reject(()=>sql.begin((db)=>fact(db,empty,{allocate:false})));
    await reject(()=>sql.begin((db)=>fact(db,real)));
    await sql`UPDATE payment_attempt SET state='unknown' WHERE id=${empty.a}`;
    await reject(()=>sql`INSERT INTO payment_attempt (payment_order_id,provider,environment,mode,currency,attempt_number,expected_minor)
      VALUES (${empty.po},${empty.provider},'live','real','INR',2,10800)`,'23505');
    await reject(()=>sql`INSERT INTO payment_order (booking_order_id,provider,environment,mode,currency,purpose,expected_minor,idempotency_key,request_hash)
      VALUES (${real.bo},${real.provider},'live','real','INR','full',9007199254740992,${randomUUID()},${hash})`);
  });
  await check('real refunds reconcile per visit; simulated source cannot become real',async()=>{
    await sql.begin((db)=>refundFact(db,captured,1000,'succeeded'));
    const summary=await ownerFinancialSummary(sql,owner.id);
    assert.equal(summary.refunded_minor,'1000'); assert.equal(summary.available_rent_minor,'9000');
    await reject(()=>sql.begin((db)=>refundFact(db,{...simFact,mode:'real',provider:real.provider,environment:'live'},100)));
    await reject(()=>sql.begin((db)=>refundFact(db,captured,9500)));
    await reject(()=>sql`UPDATE refund SET state='failed' WHERE transaction_id=${captured.t}`);
  });
  const race=await flow(); const raceFact=await sql.begin((db)=>fact(db,race));
  await check('concurrent refunds reserve at most captured funds; failed retry reuses obligation',async()=>{
    const other=postgres(targetUrl.href,options);
    let results;
    try {
      results=await Promise.allSettled([sql,other].map((db)=>db.begin((tx)=>refundFact(tx,raceFact,6000))));
      assert.equal(results.filter((r)=>r.status==='fulfilled').length,1);
      assert.equal(results.find((r)=>r.status==='rejected').reason.code,'23514');
    } finally { await other.end(); }
    const r=results.find((r)=>r.status==='fulfilled').value;
    let sources=await ownerPayoutSources(sql,owner.id);
    assert.equal(sources.find((x)=>x.allocation_id===raceFact.allocations[0].id).available_minor,'4000');
    await sql`UPDATE refund SET state='failed' WHERE id=${r.id}`;
    sources=await ownerPayoutSources(sql,owner.id);
    assert.equal(sources.find((x)=>x.allocation_id===raceFact.allocations[0].id).available_minor,'10000');
    await sql`UPDATE refund SET state='requested' WHERE id=${r.id}`;
    assert.equal((await sql`SELECT count(*)::int n FROM refund WHERE transaction_id=${raceFact.t}`)[0].n,1);
  });
  await check('stale Repeatable Read refunds abort instead of overspending',async()=>{
    const f=await flow(); const capture=await sql.begin((db)=>fact(db,f));
    const other=postgres(targetUrl.href,options);
    let arrived=0, release;
    const ready=new Promise((resolve)=>{release=resolve;});
    try {
      const results=await Promise.allSettled([sql,other].map((db)=>db.begin('isolation level repeatable read',async(tx)=>{
        await tx`SELECT id FROM payment_order WHERE id=${f.po}`;
        arrived++; if(arrived===2) release();
        await ready;
        return refundFact(tx,capture,6000);
      })));
      assert.equal(results.filter((r)=>r.status==='fulfilled').length,1);
      assert.equal(results.find((r)=>r.status==='rejected').reason.code,'40001');
    } finally { await other.end(); }
    await reject(()=>sql.begin((db)=>refundFact(db,{...captured,allocations:raceFact.allocations},100)));
  });
  await check('payouts require captured live rent, correct owner and completed real visit',async()=>{
    const pay=(allocation,bookingId,clientId,amount)=>sql`INSERT INTO payout (booking_id,client_id,gross,commission,net,funding_allocation_id,actual_net_minor)
      VALUES (${bookingId},${clientId},0,0,0,${allocation},${String(amount)}) RETURNING id`;
    await reject(()=>pay(simFact.allocations[0].id,sim.b,owner.id,1));
    await reject(()=>pay(captured.allocations[1].id,real.b,owner.id,1));
    await reject(()=>pay(captured.allocations[0].id,real.b,otherOwner.id,1));
    await sql`UPDATE booking SET state='confirmed' WHERE id=${real.b}`;
    await reject(()=>pay(captured.allocations[0].id,real.b,owner.id,1));
    await sql`UPDATE booking SET state='completed' WHERE id=${real.b}`;
    await reject(()=>pay(raceFact.allocations[0].id,race.b,owner.id,5000));
    const [p]=await pay(captured.allocations[0].id,real.b,owner.id,1000);
    await reject(()=>sql`DELETE FROM payout WHERE id=${p.id}`);
    assert.equal((await ownerPayoutSources(sql,owner.id)).find((x)=>x.allocation_id===captured.allocations[0].id).available_minor,'8000');
  });
  await check('event namespaces deduplicate and preserve verified evidence',async()=>{
    const insert=(environment)=>sql`INSERT INTO payment_event (provider,environment,external_event_id,payload_hash,signature_verified_at)
      VALUES ('fixture_provider',${environment},'event_same',${hash},${now()}) RETURNING id`;
    const [event]=await insert('live'); await insert('test'); await reject(()=>insert('live'),'23505');
    await reject(()=>sql`UPDATE payment_event SET payload_hash=${'b'.repeat(64)} WHERE id=${event.id}`);
    await sql`UPDATE payment_event SET state='processed',processed_at=now(),attempts=1 WHERE id=${event.id}`;
  });
  await check('saved methods remain empty in dummy runtime; tokens scoped and defaults unique',async()=>{
    const method=(who,environment='live',provider='fixture_provider',tokenHash=hash)=>sql`INSERT INTO customer_payment_method
      (customer_id,provider,environment,provider_customer_id,token_ciphertext,token_hash,method_family,display_label,is_default,consented_at)
      VALUES (${who},${provider},${environment},'fixture_customer','fixture_encrypted_reference',${tokenHash},'card','Card ending 1234',true,${now()}) RETURNING id`;
    await reject(()=>method(customer.id,'simulated','dummy'));
    const [m]=await method(otherCustomer.id);
    await reject(()=>method(otherCustomer.id,'live','fixture_provider','b'.repeat(64)),'23505');
    await reject(()=>sql`INSERT INTO payment_attempt (payment_order_id,provider,environment,mode,currency,attempt_number,expected_minor,method_id,state)
      VALUES (${real.po},${real.provider},'live','real','INR',3,10800,${m.id},'failed')`);
    assert.deepEqual(await customerPaymentMethods(sql,otherCustomer.id),[]);
    await sql`UPDATE "user" SET account_status='blocked' WHERE id=${otherCustomer.id}`;
    await assert.rejects(()=>customerPaymentMethods(sql,otherCustomer.id),/Active customer/);
    await assert.rejects(()=>customerPaymentMethods(sql,owner.id),/Active customer/);
  });
  console.log(`${passed} payment verification groups passed`);
} catch(e) {
  console.error('Payment verification failed:',e.code??e.cause?.code,e.cause?.message??e.message);
  if(e.code?.startsWith('ERR_')) console.error(e.stack.split('\n').slice(0,7).join('\n'));
  process.exitCode=1;
} finally {
  if(sql) await sql.end();
  if(created) { await admin.unsafe(`DROP DATABASE "${name}"`); console.log('Disposable payment database removed'); }
  await admin.end();
  if(temp) await rm(temp,{recursive:true,force:true});
}
