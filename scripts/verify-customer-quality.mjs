import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { createBookingQuote } from '../lib/booking/quotes.js';
import { addLocalDays, propertyToday } from '../lib/domain/booking-dates.js';
import { serializeJsonLd } from '../lib/seo/metadata.js';
assert.ok(!serializeJsonLd({value:'</script><script>alert(1)</script>'}).includes('<'));
await withDisposableDatabase('p18',async({sql,databaseUrl})=>{
  const [owner, , customer, otherCustomer] = await sql`INSERT INTO "user"(role,name,phone,phone_verified_at,account_status)
    VALUES('client','Lifecycle host','9000015001',now(),'active'),('client','Other host','9000015002',now(),'active'),
      ('customer','Lifecycle guest','9000015003',now(),'active'),('customer','Other guest','9000015004',now(),'active') RETURNING id`;
  const [session] = await sql`INSERT INTO customer_session(user_id,expires_at) VALUES(${customer.id},now()+interval '1 day'),(${otherCustomer.id},now()+interval '1 day') RETURNING id`;
  await sql`INSERT INTO customer_profile(user_id,completed_at) VALUES(${customer.id},now()),(${otherCustomer.id},now())`;
  const actor = { kind: 'customer', session: { role: 'customer', userId: customer.id, sessionId: session.id } };

  await sql`INSERT INTO admin_user(email,name,password_hash) VALUES('lifecycle@fixture.invalid','Lifecycle admin','unused') RETURNING id`;

  const [city] = await sql`INSERT INTO city(slug,name,state) VALUES('lifecycle','Lifecycle','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area(city_id,slug,name) VALUES(${city.id},'lifecycle','Lifecycle') RETURNING id`;
  const [category] = await sql`INSERT INTO category(slug,name,form,default_rental_unit) VALUES('farmhouse','Farmhouse','fixed','slot') RETURNING id`;
  const configuration = { timeZone: 'Asia/Kolkata', leadTimeMinutes: 0, bookingHorizonDays: 90, inventoryReady: true,
    slots: Object.fromEntries(['day','night','full_day'].map(slot => [slot, { enabled: true, startTime: slot === 'night' ? '19:00' : '09:00', endTime: slot === 'day' ? '18:00' : '08:00', endDayOffset: slot === 'day' ? 0 : 1, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, capacity: 12, includedGuests: 8, extraGuestChargeMinor: 0 }])) };
  const [listing] = await sql`INSERT INTO rentable(client_id,slug,public_code,title,category_id,city_id,area_id,status,capacity,booking_config,booking_config_version,exact_address)
    VALUES(${owner.id},'lifecycle','life0015','Current lifecycle property',${category.id},${city.id},${area.id},'live',12,${JSON.stringify(configuration)}::jsonb,1,'PRIVATE ARRIVAL ADDRESS') RETURNING id`;
  await sql`INSERT INTO rentable_price(rentable_id,slot,weekday,weekend) VALUES(${listing.id},'day',2500,2500),(${listing.id},'night',3000,3000),(${listing.id},'full_day',4000,4000)`;
  let count = 0;
  async function fixture(provenance = 'test', hours) {
    const reference = 'LIFE15-' + (++count), start = new Date(Date.now() + (hours ?? (-12 - count * 6)) * 3600000), end = new Date(+start + 3 * 3600000);
    const [order] = await sql`INSERT INTO booking_order(reference,customer_id,rentable_id,state,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,
      amount_rent_minor,amount_fee_minor,amount_deposit_minor,payment_mode,visit_provenance,idempotency_key,request_hash)
      VALUES(${reference},${customer.id},${listing.id},'confirmed','INR','Asia/Kolkata','fixture','customer-v1','{"cancellationTier":"moderate"}'::jsonb,
      '{"title":"Accepted lifecycle property","contact":{"name":"Guest","phone":"9000015003"}}'::jsonb,10000,800,0,'real',${provenance},${randomUUID()},'fixture') RETURNING id,reference`;
    const [visit] = await sql`INSERT INTO booking(reference,rentable_id,customer_id,order_id,item_position,day,local_day,slot,guests,state,hours_known,
      starts_at,ends_at,blocked_start_at,blocked_end_at,currency,time_zone,amount_rent,amount_fee,amount_deposit,amount_rent_minor,amount_fee_minor,amount_deposit_minor,payment_mode,visit_provenance,confirmed_at)
      VALUES(${reference + '-V'},${listing.id},${customer.id},${order.id},1,${start.toISOString().slice(0,10)},${start.toISOString().slice(0,10)},'day',5,'confirmed',true,
        ${start.toISOString()},${end.toISOString()},${start.toISOString()},${end.toISOString()},'INR','Asia/Kolkata',100,8,0,10000,800,0,'real',${provenance},now()) RETURNING id,lifecycle_version`;
    await sql`INSERT INTO inventory_reservation(booking_id,rentable_id,source,blocked_start_at,blocked_end_at,state)
      VALUES(${visit.id},${listing.id},'booking',${start.toISOString()},${end.toISOString()},'committed')`;
    return { ...order, visitId: visit.id, version: visit.lifecycle_version, start, end, provenance };
  }

  const order=await fixture('test',12);
  await sql`UPDATE rentable SET description=${'A peaceful visit. </script><script>globalThis.RENTRA_INJECTION=true</script>'},photos=${JSON.stringify([{url:'/brand/rentra-lockup.svg',alt:'Rentra fixture property',width:800,height:600}])}::jsonb WHERE id=${listing.id}`;
  await sql`INSERT INTO rentable(client_id,slug,public_code,title,category_id,city_id,area_id,status,capacity)
    VALUES(${owner.id},'second','qual0002','Second quality property',${category.id},${city.id},${area.id},'live',10),
    (${owner.id},'third','qual0003','Third quality property',${category.id},${city.id},${area.id},'live',10),
    (${owner.id},'paused','qual0004','Paused quality property',${category.id},${city.id},${area.id},'paused',10)`;
  const {verifyQualityBrowser}=await import('./lib/customer-quality-browser.mjs');
  const day=addLocalDays(propertyToday(),20);
  await sql`INSERT INTO availability(rentable_id,day,slot,units_available,blocked_by_client) VALUES(${listing.id},${day},'day',1,false)`;
  const createQuote=()=>createBookingQuote(sql,{rentableId:listing.id,dates:[day],slot:'day',guests:2},{customerId:customer.id});
  await verifyQualityBrowser({databaseUrl,actor,order,createQuote});
});
console.log('Part 18 quality gate passed; disposable database removed. No provider requests.');
