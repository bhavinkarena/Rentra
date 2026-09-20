import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { listBookingRecords, readBookingRecord, historyFilters } from '../lib/booking/records.js';
import { bookingSummary } from '../lib/domain/booking-record.js';

const env = { NODE_ENV: 'test' };
let passed = 0;
async function check(label, run) { await run(); console.log('PASS ' + label); passed++; }
await withDisposableDatabase('p13', async ({ sql, databaseUrl }) => {
  const [owner, otherOwner, customer, otherCustomer] = await sql`INSERT INTO "user"(role,name,phone,account_status)
    VALUES('client','Records host','9000013001','active'),('client','Other host','9000013002','active'),
    ('customer','Records guest','9000013003','active'),('customer','Other guest','9000013004','active') RETURNING id,role`;
  const [session, otherSession] = await sql`INSERT INTO customer_session(user_id,expires_at) VALUES(${customer.id},now()+interval '1 day'),(${otherCustomer.id},now()+interval '1 day') RETURNING id,user_id`;
  await sql`INSERT INTO customer_profile(user_id,completed_at) VALUES(${customer.id},now()),(${otherCustomer.id},now())`;
  const [admin] = await sql`INSERT INTO admin_user(email,name,password_hash) VALUES('records@fixture.invalid','Records admin','unused') RETURNING id`;
  const [city] = await sql`INSERT INTO city(slug,name,state) VALUES('records','Records','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area(city_id,slug,name) VALUES(${city.id},'records','Records') RETURNING id`;
  const [category] = await sql`INSERT INTO category(slug,name,form,default_rental_unit) VALUES('records','Records','fixed','slot') RETURNING id`;
  const [listing] = await sql`INSERT INTO rentable(client_id,slug,public_code,title,category_id,city_id,area_id,status,exact_address,location)
    VALUES(${owner.id},'records','rec0013','Changed public title',${category.id},${city.id},${area.id},'paused','PRIVATE ARRIVAL ADDRESS',ST_SetSRID(ST_MakePoint(72.8,21.1),4326)) RETURNING id`;
  const actor = { kind: 'customer', session: { role: 'customer', userId: customer.id, sessionId: session.id, development: true } };
  const stranger = { kind: 'customer', session: { role: 'customer', userId: otherCustomer.id, sessionId: otherSession.id, development: true } };
  const host = { kind: 'owner', id: owner.id }, staff = { kind: 'admin', id: admin.id };
  const snapshot = JSON.stringify({ title: 'Accepted original title', contact: { name: 'Saved guest', phone: '9000013003' }, purpose: 'Family reunion', privateInternal: 'NEVER SERIALIZE' });
  const orders = await sql`INSERT INTO booking_order(reference,customer_id,rentable_id,state,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,
    amount_rent_minor,amount_fee_minor,amount_deposit_minor,payment_mode,visit_provenance,idempotency_key,request_hash)
    SELECT 'RECORD-'||n,${customer.id},${listing.id},'confirmed','INR','Asia/Kolkata','fixture','fixture','{"cancellationTier":"moderate","houseRules":["Keep quiet"]}'::jsonb,${snapshot}::jsonb,
      30000,2400,9000,'real','test',gen_random_uuid()::text,'fixture' FROM generate_series(1,23) n RETURNING id,reference`;
  const target = orders[0];
  const visits = await sql`INSERT INTO booking(reference,rentable_id,customer_id,order_id,item_position,day,local_day,slot,guests,state,hours_known,
    starts_at,ends_at,blocked_start_at,blocked_end_at,currency,time_zone,amount_rent,amount_fee,amount_deposit,amount_rent_minor,amount_fee_minor,amount_deposit_minor,payment_mode,visit_provenance,confirmed_at,cancelled_at)
    SELECT 'REC13-'||n,${listing.id},${customer.id},${target.id},n,current_date+(n-2)*10,current_date+(n-2)*10,'day',5,
      CASE WHEN n=1 THEN 'completed'::booking_state WHEN n=2 THEN 'cancelled'::booking_state ELSE 'confirmed'::booking_state END,true,
      now()+((n-2)*10||' days')::interval,now()+((n-2)*10||' days')::interval+interval '5 hours',
      now()+((n-2)*10||' days')::interval,now()+((n-2)*10||' days')::interval+interval '5 hours','INR','Asia/Kolkata',100,8,30,10000,800,3000,'real','test',now()-interval '15 days',CASE WHEN n=2 THEN now() ELSE NULL END
    FROM generate_series(1,3) n RETURNING id,reference,state`;
  await sql`INSERT INTO booking_lifecycle_event(order_id,kind,payload) VALUES(${target.id},'confirmed','{"private":"NEVER SERIALIZE"}'::jsonb)`;
  await sql.begin(async tx => {
    const [payment] = await tx`INSERT INTO payment_order(booking_order_id,provider,environment,mode,currency,purpose,expected_minor,idempotency_key,request_hash,provider_order_id,state)
      VALUES(${target.id},'razorpay','test','real','INR','full',32400,'record-fixture-001',${'a'.repeat(64)},'order_RecordsFixture','succeeded') RETURNING id`;
    const [attempt] = await tx`INSERT INTO payment_attempt(payment_order_id,provider,environment,mode,currency,attempt_number,expected_minor,provider_payment_id,state)
      VALUES(${payment.id},'razorpay','test','real','INR',1,32400,'pay_RecordsFixture','succeeded') RETURNING id`;
    const [capture] = await tx`INSERT INTO payment_transaction(attempt_id,reference,provider,environment,mode,currency,provider_payment_id,external_ledger_id,kind,outcome,expected_minor,captured_minor,verified_at,evidence_hash)
      VALUES(${attempt.id},'RECORD-CAPTURE','razorpay','test','real','INR','pay_RecordsFixture','pay_RecordsFixture','capture','succeeded',32400,32400,now(),${'b'.repeat(64)}) RETURNING id`;
    await tx`INSERT INTO payment_allocation(transaction_id,booking_id,component,actual_minor)
      SELECT ${capture.id},id,'rent',10000 FROM booking WHERE order_id=${target.id}`;
    await tx`INSERT INTO payment_allocation(transaction_id,booking_id,component,actual_minor)
      SELECT ${capture.id},id,'fee',800 FROM booking WHERE order_id=${target.id}`;
  });
  await check('owned pagination/search, literal wildcards and mixed-order history tabs', async () => {
    const page = await listBookingRecords(sql, actor, {}, env);
    assert.equal(page.total, 23); assert.equal(page.items.length, 20); assert.equal(page.pages, 2);
    const last = await listBookingRecords(sql, actor, { page: 2 }, env);
    assert.equal(last.items.length, 3); assert.equal(new Set([...page.items, ...last.items].map(x => x.id)).size, 23);
    assert.equal((await listBookingRecords(sql, actor, { q: visits[0].reference }, env)).total, 1);
    assert.equal((await listBookingRecords(sql, actor, { q: '%' }, env)).total, 0);
    for (const tab of ['upcoming', 'past', 'cancelled']) assert.equal((await listBookingRecords(sql, actor, { tab }, env)).items[0].id, target.id);
    assert.equal((await listBookingRecords(sql, stranger, {}, env)).total, 0);
    assert.deepEqual(historyFilters({ page: '-4', q: ['bad'], tab: 'bad' }), { page: 1, q: '', tab: 'all' });
  });
  await check('immutable sold details, per-visit timelines, private arrival and Test payment separation', async () => {
    const record = await readBookingRecord(sql, actor, target.id, env);
    assert.equal(record.title, 'Accepted original title'); assert.equal(record.purpose, 'Family reunion');
    assert.equal(record.arrival.address, 'PRIVATE ARRIVAL ADDRESS'); assert.equal(record.arrival.visitIds.length, 2);
    assert.equal(record.visits[1].timeline.at(-1).kind, 'cancelled');
    assert.equal(record.payments[0].capturedMinor, 32400); assert.equal(record.payments[0].actualBankMinor, 0);
    assert.ok(!JSON.stringify(record).includes('NEVER SERIALIZE'));
    const receipt = bookingSummary(record); assert.match(receipt, /TEST PAYMENT/); assert.match(receipt, /order_RecordsFixture/);
    assert.ok(!receipt.includes('PRIVATE ARRIVAL ADDRESS'));
    assert.deepEqual(await readBookingRecord(sql, actor, target.id, env), record);
  });
  await check('unowned and malformed references reject; owner/admin scope checks apply independently', async () => {
    for (const bad of [stranger, { kind: 'owner', id: otherOwner.id }, { kind: 'owner', id: customer.id }, { kind: 'admin', id: randomUUID() }]) {
      await assert.rejects(() => readBookingRecord(sql, bad, target.id, env));
    }
    await assert.rejects(() => readBookingRecord(sql, actor, 'bad', env));
    assert.equal((await readBookingRecord(sql, host, target.id, env)).contact.name, 'Saved guest');
    assert.equal((await readBookingRecord(sql, staff, target.id, env)).visits.length, 3);
    assert.equal((await listBookingRecords(sql, { kind: 'owner', id: otherOwner.id }, {}, env)).total, 0);
  });
  if (process.env.CUSTOMER_BROWSER_DRIVER) {
    const { verifyRecordsBrowser } = await import('./lib/customer-records-browser.mjs');
    await check('390px browser history/detail/download and customer/owner/admin isolation', () => verifyRecordsBrowser({ databaseUrl, actor, stranger, owner, otherOwner, admin, target }));
  }
  await check('hidden listing history survives; cancelled and unconfirmed visits cannot reveal arrival', async () => {
    await sql`UPDATE rentable SET status='hidden' WHERE id=${listing.id}`;
    assert.equal((await readBookingRecord(sql, actor, target.id, env)).title, 'Accepted original title');
    await sql`UPDATE booking SET state='cancelled' WHERE order_id=${target.id}`;
    assert.equal((await readBookingRecord(sql, actor, target.id, env)).arrival, null);
    await sql`UPDATE booking SET state='requested',confirmed_at=NULL WHERE order_id=${target.id}`;
    assert.equal((await readBookingRecord(sql, actor, target.id, env)).arrival, null);
  });
  await check('revoked customer sessions and inactive operator accounts fail closed', async () => {
    await sql`UPDATE customer_session SET revoked_at=now() WHERE id=${session.id}`;
    await assert.rejects(() => readBookingRecord(sql, actor, target.id, env));
    await assert.rejects(() => listBookingRecords(sql, actor, {}, env));
    await sql`UPDATE admin_user SET is_active=false WHERE id=${admin.id}`;
    await assert.rejects(() => readBookingRecord(sql, staff, target.id, env));
    await sql`UPDATE "user" SET account_status='suspended' WHERE id=${owner.id}`;
    await assert.rejects(() => readBookingRecord(sql, host, target.id, env));
  });
});
console.log(`Part 13: ${passed} groups passed; disposable database removed.`);
