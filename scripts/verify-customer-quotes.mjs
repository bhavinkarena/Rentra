/** Real PostgreSQL integration/concurrency checks. Only newly created test DBs are written. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { createBookingQuote, getBookingAvailability, revalidateBookingQuote } from '../lib/booking/quotes.js';
import { saveBookingConfiguration, saveBookingPriceOverride, openBookingDates } from '../lib/booking/owner-settings.js';
import { withListingInventory, findInventoryConflicts, expireInventoryHolds, createOwnerBlock, releaseOwnerBlock } from '../lib/booking/inventory.js';
import { addLocalDays, propertyToday, visitInterval, propertyLocalInstant } from '../lib/domain/booking-dates.js';
import { parseINRMinor } from '../lib/domain/booking-money.js';
import { getPaymentConfiguration, setPaymentGatewayConfiguration, requireNewPaymentConfiguration, resolvePinnedPaymentConfiguration } from '../lib/payments/gateway-settings.js';
import { requirePaymentCredentials } from '../lib/payments/provider-credentials.js';

let passed = 0;
async function check(label, run) { await run(); console.log('PASS ' + label); passed++; }
const fails = (run, code) => assert.rejects(run, (error) => error.code === code);
const env = { RAZORPAY_TEST_KEY_ID: 'rzp_test_Fixture', RAZORPAY_TEST_KEY_SECRET: 'fixture-secret', RAZORPAY_TEST_WEBHOOK_SECRET: 'fixture-webhook' };
const day = addLocalDays(propertyToday(), 14);
const config = {
  timeZone: 'Asia/Kolkata', leadTimeMinutes: 60, bookingHorizonDays: 90,
  slots: {
    day: { enabled: true, startTime: '09:00', endTime: '18:00', endDayOffset: 0, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, capacity: 12, includedGuests: 8, extraGuestChargeMinor: 30000 },
    night: { enabled: true, startTime: '18:00', endTime: '10:00', endDayOffset: 1, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, capacity: 12, includedGuests: 8, extraGuestChargeMinor: 30000 },
    full_day: { enabled: true, startTime: '09:00', endTime: '09:00', endDayOffset: 1, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, capacity: 12, includedGuests: 8, extraGuestChargeMinor: 30000 },
  },
};
await withDisposableDatabase('p04', async ({ sql, connect }) => {
  const [owner] = await sql`INSERT INTO "user" (role,email,account_status) VALUES ('client','owner@fixture.invalid','active') RETURNING id`;
  const [otherOwner] = await sql`INSERT INTO "user" (role,email,account_status) VALUES ('client','other@fixture.invalid','active') RETURNING id`;
  const [customer] = await sql`INSERT INTO "user" (role,phone,account_status) VALUES ('customer','9000000090','active') RETURNING id`;
  const [otherCustomer] = await sql`INSERT INTO "user" (role,phone,account_status) VALUES ('customer','9000000091','active') RETURNING id`;
  const [admin] = await sql`INSERT INTO admin_user (email,name,password_hash) VALUES ('admin@fixture.invalid','Fixture','not-a-login-hash') RETURNING id`;
  const [city] = await sql`INSERT INTO city (slug,name,state) VALUES ('fixture','Fixture','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area (city_id,slug,name) VALUES (${city.id},'fixture','Fixture') RETURNING id`;
  const [category] = await sql`INSERT INTO category (slug,name,form,default_rental_unit) VALUES ('fixture','Fixture','fixed','slot') RETURNING id`;
  const [listing] = await sql`INSERT INTO rentable (client_id,slug,public_code,title,category_id,city_id,area_id,status,capacity,deposit_amount)
    VALUES (${owner.id},'fixture','fixture001','Fixture',${category.id},${city.id},${area.id},'live',12,2000) RETURNING id`;
  await sql`INSERT INTO rentable_price (rentable_id,slot,weekday,weekend) VALUES (${listing.id},'day',6000,6000),(${listing.id},'night',7000,7000),(${listing.id},'full_day',12000,12000)`;
  const selection = { rentableId: listing.id, dates: [day], slot: 'day', guests: 8 };
  const quote = (input = selection) => createBookingQuote(sql, input, { customerId: customer.id, variables: env });
  const accepted = (q, customerId = customer.id) => withListingInventory(sql, listing.id, (tx, row) => revalidateBookingQuote(tx, row, { quoteId: q.id, hash: q.hash, version: q.version, customerId }, env));
  const setting = (expectedVersion, enabled, collectionPurpose = 'full') => ({ actorId: admin.id, expectedVersion, provider: 'razorpay', environment: 'test', enabled, collectionPurpose });

  await check('default-disabled gateway, role checks, explicit test credentials and no fallback', async () => {
    assert.equal((await getPaymentConfiguration(sql, env)).enabled, false);
    await fails(() => requireNewPaymentConfiguration(sql, {}, env), 'PAYMENTS_DISABLED');
    await fails(() => setPaymentGatewayConfiguration(sql, { ...setting(0, true), actorId: owner.id }, env), 'ADMIN_REQUIRED');
    await fails(() => setPaymentGatewayConfiguration(sql, { ...setting(0, true), provider: 'unknown' }, env), 'UNSUPPORTED_GATEWAY');
    await fails(() => setPaymentGatewayConfiguration(sql, { ...setting(0, true), environment: 'live' }, env), 'INVALID_GATEWAY_CHANGE');
    await fails(() => setPaymentGatewayConfiguration(sql, setting(0, true), {}), 'GATEWAY_CREDENTIALS_MISSING');
    assert.throws(() => requirePaymentCredentials('razorpay','test',{ ...env, RAZORPAY_TEST_KEY_ID: 'rzp_live_Nope' }));
    assert.throws(() => requirePaymentCredentials('razorpay','test',{ RAZORPAY_KEY_ID: env.RAZORPAY_TEST_KEY_ID, RAZORPAY_KEY_SECRET: 'nope' }));
  });
  await check('gateway revisions are audited, immutable and stale admin updates conflict', async () => {
    const pinned = await setPaymentGatewayConfiguration(sql, setting(0, true), env);
    assert.equal(pinned.version,1);
    await fails(() => setPaymentGatewayConfiguration(sql, setting(0,false), env), 'GATEWAY_VERSION_CONFLICT');
    assert.equal((await sql`SELECT count(*)::int n FROM audit_log WHERE entity='payment_gateway_config'`)[0].n,1);
    await fails(() => sql`UPDATE payment_gateway_config SET enabled=false WHERE version=1`, '23514');
    await fails(() => sql`DELETE FROM payment_gateway_config WHERE version=1`, '23514');
  });
  await check('unconfigured hours and foreign owners cannot enable booking', async () => {
    await fails(() => quote(), 'SCHEDULE_UNAVAILABLE');
    await fails(() => saveBookingConfiguration(sql, otherOwner.id, { rentableId: listing.id, expectedVersion:0, configuration:config }), 'FORBIDDEN');
    await saveBookingConfiguration(sql, owner.id, { rentableId:listing.id,expectedVersion:0,configuration:config });
    await fails(() => quote(), 'AVAILABILITY_CONFLICT'); // No owner-created inventory rows yet.
    await openBookingDates(sql,owner.id,{rentableId:listing.id,from:day,to:addLocalDays(day,40)});
    await fails(() => saveBookingConfiguration(sql,owner.id,{rentableId:listing.id,expectedVersion:0,configuration:config}), 'CONFIG_CHANGED');
  });
  await check('persisted quote, calendar, guest charges and exact decimal overrides agree', async () => {
    assert.equal(parseINRMinor('100.25'),10025); assert.throws(() => parseINRMinor('100.251'));
    await saveBookingPriceOverride(sql,owner.id,{rentableId:listing.id,day,slot:'day',rentMinor:10025});
    const q = await quote();
    assert.equal(q.totals.rentMinor,10025); assert.equal(q.totals.feeMinor,802); assert.equal(q.payment.expectedMinor,10827);
    assert.equal(q.payment.actualCollectedMinor,0); assert.equal(q.payment.environment,'test');
    const calendar = await getBookingAvailability(sql,{rentableId:listing.id,from:day,to:day,guests:8},env);
    assert.deepEqual(calendar.days[day].pricesMinor.day,q.totals);
    const extra = await quote({ ...selection,guests:10 }); assert.equal(extra.totals.rentMinor,70025);
    await fails(() => quote({ ...selection,guests:13 }), 'CAPACITY_EXCEEDED');
    assert.equal((await accepted(q)).id,q.id);
    await fails(() => accepted(q,otherCustomer.id), 'QUOTE_NOT_FOUND');
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation`)[0].n,0);
    assert.equal((await sql`SELECT count(*)::int n FROM payment_transaction`)[0].n,0);
  });
  await check('gateway disable leaves dates/quotes available and pinned existing intents resolvable', async () => {
    const old = await quote();
    await setPaymentGatewayConfiguration(sql,setting(1,false),env);
    await fails(() => requireNewPaymentConfiguration(sql,{},env),'PAYMENTS_DISABLED');
    assert.equal((await resolvePinnedPaymentConfiguration(sql,old.payment)).version,1);
    await fails(() => accepted(old),'QUOTE_CHANGED');
    const current = await quote(); assert.equal(current.payment.enabled,false);
    assert.equal((await getBookingAvailability(sql,{rentableId:listing.id,from:day,to:day,guests:8},env)).days[day].day,true);
    await setPaymentGatewayConfiguration(sql,setting(2,true,'advance'),env);
    const advance = await quote(); assert.equal(advance.payment.expectedMinor,3308);
    assert.equal(advance.payment.allocations[0].rentMinor + advance.payment.allocations[0].feeMinor,3308);
  });
  await check('price, policy, expiry and suspended-account changes invalidate accepted quotes', async () => {
    let q = await quote();
    await saveBookingPriceOverride(sql,owner.id,{rentableId:listing.id,day,slot:'day',rentMinor:20000});
    await fails(() => accepted(q),'QUOTE_CHANGED');
    q = await quote(); await sql`UPDATE rentable SET cancellation_tier='strict' WHERE id=${listing.id}`;
    await fails(() => accepted(q),'QUOTE_CHANGED');
    q = await quote(); await sql`UPDATE booking_quote SET created_at=now()-interval '20 minutes',expires_at=now()-interval '10 minutes' WHERE id=${q.id}`;
    await fails(() => accepted(q),'QUOTE_EXPIRED');
    q = await quote(); await sql`UPDATE "user" SET account_status='suspended' WHERE id=${customer.id}`;
    await fails(() => accepted(q),'CUSTOMER_REQUIRED');
    await sql`UPDATE "user" SET account_status='active' WHERE id=${customer.id}`;
  });
  await check('legacy owner block overrides positive units and rejects adjacent overnight overlap', async () => {
    const next = addLocalDays(day,1);
    await sql`UPDATE availability SET blocked_by_client=true WHERE rentable_id=${listing.id} AND day=${next} AND slot='day'`;
    await fails(() => quote({ ...selection,slot:'night' }),'AVAILABILITY_CONFLICT');
    const calendar=await getBookingAvailability(sql,{rentableId:listing.id,from:day,to:next,guests:8},env);
    assert.equal(calendar.days[day].night,false); assert.equal(calendar.days[next].day,false);
    await openBookingDates(sql,owner.id,{rentableId:listing.id,from:next,to:next});
    assert.equal((await sql`SELECT blocked_by_client FROM availability WHERE rentable_id=${listing.id} AND day=${next} AND slot='day'`)[0].blocked_by_client,true);
    await sql`UPDATE availability SET blocked_by_client=false WHERE rentable_id=${listing.id} AND day=${next} AND slot='day'`;
  });
  await check('owner blocks use the shared ledger, release once, and enforce owner access', async () => {
    const interval = visitInterval({date:day,slot:'day',schedule:config.slots.day});
    const block=await createOwnerBlock(sql,owner.id,{rentableId:listing.id,...interval,reason:'Fixture repair'});
    await fails(() => quote(),'AVAILABILITY_CONFLICT');
    await fails(() => releaseOwnerBlock(sql,otherOwner.id,{rentableId:listing.id,blockId:block.id}),'FORBIDDEN');
    assert.equal((await releaseOwnerBlock(sql,owner.id,{rentableId:listing.id,blockId:block.id})).changed,true);
    assert.equal((await releaseOwnerBlock(sql,owner.id,{rentableId:listing.id,blockId:block.id})).changed,false);
    assert.equal((await quote()).visits.length,1);
  });
  await check('multiple dates are all-or-nothing and no quote or partial order survives conflicts', async () => {
    const last=addLocalDays(day,3), interval=visitInterval({date:last,slot:'day',schedule:config.slots.day});
    const block=await createOwnerBlock(sql,owner.id,{rentableId:listing.id,...interval,reason:'Fixture closure'});
    const before=(await sql`SELECT count(*)::int n FROM booking_quote`)[0].n;
    await fails(() => quote({...selection,dates:[day,addLocalDays(day,2),last]}),'AVAILABILITY_CONFLICT');
    assert.equal((await sql`SELECT count(*)::int n FROM booking_quote`)[0].n,before);
    assert.equal((await sql`SELECT count(*)::int n FROM booking_order`)[0].n,0);
    await releaseOwnerBlock(sql,owner.id,{rentableId:listing.id,blockId:block.id});
    assert.equal((await quote({...selection,dates:[last,day]})).visits.length,2);
  });
  await check('unknown active legacy inventory fails closed until explicitly reconciled', async () => {
    const [legacy]=await sql`INSERT INTO booking(reference,customer_id,rentable_id,day,slot,amount_rent,amount_fee,state) VALUES ('UNKNOWN',${customer.id},${listing.id},${day},'day',100,8,'confirmed') RETURNING id`;
    await fails(() => quote(),'INVENTORY_REMEDIATION_REQUIRED');
    await sql`UPDATE booking SET state='cancelled' WHERE id=${legacy.id}`;
    assert.equal((await quote()).visits.length,1);
  });

  async function allocate(database, date, slot='day', held=false) {
    return withListingInventory(database,listing.id,async(tx,row) => {
      const interval=visitInterval({date,slot,schedule:config.slots[slot]});
      const conflicts=await findInventoryConflicts(tx,row,[interval]);
      if(conflicts.length) throw Object.assign(new Error('Conflict'),{code:'AVAILABILITY_CONFLICT'});
      const expiry=new Date(Date.now()+600000);
      const [order]=await tx`INSERT INTO booking_order(reference,customer_id,rentable_id,state,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,amount_rent_minor,amount_fee_minor,amount_deposit_minor,payment_mode,visit_provenance,idempotency_key,request_hash,hold_expires_at)
        VALUES(${randomUUID()},${customer.id},${listing.id},${held?'held':'confirmed'},'INR','Asia/Kolkata','fixture','fixture','{}','{}',10000,800,0,'real','test',${randomUUID()},${'a'.repeat(64)},${held?expiry.toISOString():null}) RETURNING id`;
      const [visit]=await tx`INSERT INTO booking(reference,customer_id,rentable_id,day,slot,amount_rent,amount_fee,state,order_id,item_position,local_day,currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,hours_known,starts_at,ends_at,blocked_start_at,blocked_end_at,payment_mode,visit_provenance)
        VALUES(${randomUUID().slice(0,16)},${customer.id},${listing.id},${date},${slot},100,8,${held?'requested':'confirmed'},${order.id},1,${date},'INR','Asia/Kolkata',10000,800,0,true,${interval.startsAt},${interval.endsAt},${interval.blockedStartAt},${interval.blockedEndAt},'real','test') RETURNING id`;
      await tx`INSERT INTO inventory_reservation(booking_id,rentable_id,source,blocked_start_at,blocked_end_at,state,hold_expires_at)
        VALUES(${visit.id},${listing.id},'booking',${interval.blockedStartAt},${interval.blockedEndAt},${held?'held':'committed'},${held?expiry.toISOString():null})`;
      return {orderId:order.id,visitId:visit.id,interval};
    });
  }
  await check('two independent clients contest the last interval with exactly one winner', async () => {
    const other=connect(), date=addLocalDays(day,6);
    const outcomes=await Promise.allSettled([allocate(sql,date),allocate(other,date)]);
    assert.equal(outcomes.filter((result)=>result.status==='fulfilled').length,1);
    assert.equal(outcomes.filter((result)=>result.status==='rejected' && result.reason.code==='AVAILABILITY_CONFLICT').length,1);
  });
  await check('owner block racing booking allocation has one winner and retains no partial loser', async () => {
    const other=connect(), date=addLocalDays(day,8), interval=visitInterval({date,slot:'day',schedule:config.slots.day});
    const outcomes=await Promise.allSettled([allocate(sql,date),createOwnerBlock(other,owner.id,{rentableId:listing.id,...interval,reason:'Race fixture'})]);
    assert.equal(outcomes.filter((result)=>result.status==='fulfilled').length,1);
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation WHERE rentable_id=${listing.id} AND state='committed' AND blocked_start_at=${interval.blockedStartAt}`)[0].n,1);
  });
  await check('overnight allocation prevents next-day daytime and full-day overlaps', async () => {
    const date=addLocalDays(day,10); await allocate(sql,date,'night');
    await fails(()=>quote({...selection,dates:[addLocalDays(date,1)]}),'AVAILABILITY_CONFLICT');
    await fails(()=>quote({...selection,dates:[date],slot:'full_day'}),'AVAILABILITY_CONFLICT');
    assert.equal(propertyLocalInstant(date,'00:00'),`${addLocalDays(date,-1)}T18:30:00.000Z`);
  });
  await check('expiry releases held inventory once without touching another confirmed order', async () => {
    const date=addLocalDays(day,15), held=await allocate(sql,date,'day',true);
    await sql`UPDATE booking_order SET hold_expires_at=now()-interval '1 minute' WHERE id=${held.orderId}`;
    await sql`UPDATE inventory_reservation SET hold_expires_at=now()-interval '1 minute' WHERE booking_id=${held.visitId}`;
    await withListingInventory(sql,listing.id,async(tx)=>{
      assert.equal((await expireInventoryHolds(tx,listing.id)).ordersExpired,1);
      assert.equal((await expireInventoryHolds(tx,listing.id)).ordersExpired,0);
    });
    assert.equal((await quote({...selection,dates:[date]})).visits.length,1);
    assert.ok((await sql`SELECT count(*)::int n FROM inventory_reservation WHERE source='booking' AND state='committed'`)[0].n>0);
  });
  await check('database exclusion protects against writers bypassing the application mutex', async () => {
    const [existing]=await sql`SELECT blocked_start_at,blocked_end_at FROM inventory_reservation WHERE state='committed' LIMIT 1`;
    await fails(()=>sql`INSERT INTO inventory_reservation(rentable_id,source,blocked_start_at,blocked_end_at,state) VALUES(${listing.id},'owner_block',${new Date(existing.blocked_start_at).toISOString()},${new Date(existing.blocked_end_at).toISOString()},'committed')`,'23P01');
  });
});
console.log(`Customer quote/inventory/gateway: ${passed} groups passed; disposable database removed.`);
