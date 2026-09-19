import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { createBookingQuote } from '../lib/booking/quotes.js';
import { createCheckoutHold, readCheckoutStatus } from '../lib/booking/checkout.js';
import { withListingInventory, expireInventoryHolds, createOwnerBlock, releaseOwnerBlock } from '../lib/booking/inventory.js';
import { setPaymentGatewayConfiguration } from '../lib/payments/gateway-settings.js';
import { startCheckoutPayment, verifyCheckoutPayment, reconcilePayment } from '../lib/payments/checkout-service.js';
import { ingestRazorpayEvent, processNextPaymentEvent } from '../lib/payments/webhooks.js';
import { razorpayTestAdapter, validSignature } from '../lib/payments/razorpay-test.js';
import { runPaymentJobs } from '../lib/payments/jobs.js';
import { ownerFinancialSummary, ownerPayoutSources } from '../lib/payments/accounting.js';
import { addLocalDays, propertyToday } from '../lib/domain/booking-dates.js';

const env={NODE_ENV:'test',RAZORPAY_TEST_KEY_ID:'rzp_test_CheckoutFixture',RAZORPAY_TEST_KEY_SECRET:'fixture-api-secret',RAZORPAY_TEST_WEBHOOK_SECRET:'fixture-webhook-secret'};
const sign=(data,secret=env.RAZORPAY_TEST_KEY_SECRET)=>createHmac('sha256',secret).update(data).digest('hex');
const fail=(run,code)=>assert.rejects(run,error=>error.code===code);
let passed=0;
async function check(label,run){await run(); console.log('PASS '+label);passed++;}
let serial=0, loseResponse=false, mismatch=null, beforePost=null;
const orders=new Map(),payments=new Map(),calls=[];
const fetcher=async(url,options)=>{
  const route=new URL(url);calls.push({path:route.pathname,method:options.method});
  assert.ok(url.startsWith('https://api.razorpay.com/v1/'));
  if(options.method==='POST') {
    if(beforePost) await beforePost();
    const body=JSON.parse(options.body),order={...body,id:'order_Fixture'+(++serial),status:'created'};
    assert.equal(body.partial_payment,false);orders.set(order.id,order);
    if(loseResponse){loseResponse=false;throw new Error('Lost provider response');}
    return Response.json(order);
  }
  if(route.pathname==='/v1/orders') return Response.json({items:[...orders.values()].filter(o=>o.receipt===route.searchParams.get('receipt'))});
  if(route.pathname.startsWith('/v1/payments/')) {
    const payment=payments.get(route.pathname.split('/').at(-1));
    return Response.json(mismatch?{...payment,...mismatch}:payment);
  }
  const orderId=route.pathname.split('/')[3];
  return Response.json({items:[...payments.values()].filter(p=>p.order_id===orderId)});
};
const options={env,fetcher};

await check('adapter rejects live keys, validates HMAC, scope and uncertain outcomes',async()=>{
  assert.throws(()=>razorpayTestAdapter('rzp_live_wrong',options));
  assert.equal(validSignature('x',sign('x'),env.RAZORPAY_TEST_KEY_SECRET),true);
  assert.equal(validSignature('y',sign('x'),env.RAZORPAY_TEST_KEY_SECRET),false);
  const adapter=razorpayTestAdapter(env.RAZORPAY_TEST_KEY_ID,options);
  await fail(()=>adapter.createOrder({id:randomUUID(),expected_minor:999,provider_order_id:'order_wrong'}),'PROVIDER_ORDER_MISMATCH');
});

await withDisposableDatabase('p11',async({sql,connect})=>{
  const [owner]=await sql`INSERT INTO "user"(role,name,account_status) VALUES('client','Checkout owner','active') RETURNING id`;
  const customer=async phone=>{
    const [u]=await sql`INSERT INTO "user"(role,name,phone,account_status) VALUES('customer','Checkout customer',${phone},'active') RETURNING id`;
    const [s]=await sql`INSERT INTO customer_session(user_id,expires_at) VALUES(${u.id},now()+interval '1 day') RETURNING id`;
    return {userId:u.id,sessionId:s.id,role:'customer',development:true};
  };
  const first=await customer('9000001101'),second=await customer('9000001102');
  const [admin]=await sql`INSERT INTO admin_user(email,name,password_hash) VALUES('checkout@fixture.invalid','Fixture','not-a-password') RETURNING id`;
  const [city]=await sql`INSERT INTO city(slug,name,state) VALUES('checkout','Checkout','Gujarat') RETURNING id`;
  const [area]=await sql`INSERT INTO area(city_id,slug,name) VALUES(${city.id},'area','Area') RETURNING id`;
  const [category]=await sql`INSERT INTO category(slug,name,form,default_rental_unit) VALUES('farm','Farm','fixed','slot') RETURNING id`;
  const day=addLocalDays(propertyToday(),20);
  const configuration={timeZone:'Asia/Kolkata',leadTimeMinutes:0,bookingHorizonDays:90,inventoryReady:true,
    slots:Object.fromEntries(['day','night','full_day'].map(slot=>[slot,{enabled:true,startTime:slot==='night'?'19:00':'09:00',endTime:slot==='day'?'18:00':'08:00',endDayOffset:slot==='day'?0:1,bufferBeforeMinutes:0,bufferAfterMinutes:0,capacity:12,includedGuests:8,extraGuestChargeMinor:30000}]))};
  const [listing]=await sql`INSERT INTO rentable(client_id,slug,public_code,title,category_id,city_id,area_id,status,capacity,deposit_amount,booking_config,booking_config_version)
    VALUES(${owner.id},'checkout','check011','Checkout fixture',${category.id},${city.id},${area.id},'live',12,2000,${JSON.stringify(configuration)}::jsonb,1) RETURNING id`;
  await sql`INSERT INTO rentable_price(rentable_id,slot,weekday,weekend) VALUES(${listing.id},'day',1000,1200),(${listing.id},'night',2000,2400),(${listing.id},'full_day',3000,3600)`;
  await sql`INSERT INTO availability(rentable_id,day,slot,units_available,blocked_by_client)
    SELECT ${listing.id},d::date,s::availability_slot,1,false FROM generate_series(${day}::date,${addLocalDays(day,50)}::date,interval '1 day') d CROSS JOIN unnest(ARRAY['day','night']) s`;
  let configVersion=0;
  const config=async(enabled=true,collectionPurpose='full')=>{
    const result=await setPaymentGatewayConfiguration(sql,{actorId:admin.id,expectedVersion:configVersion,provider:'razorpay',environment:'test',enabled,collectionPurpose},env);
    configVersion=result.version;return result;
  };
  const quote=(session=first,offset=0,count=1,slot='day')=>createBookingQuote(sql,{rentableId:listing.id,dates:Array.from({length:count},(_,i)=>addLocalDays(day,offset+i)),slot,guests:10},{customerId:session.userId,variables:env});
  const input=q=>({rentableId:listing.id,quoteId:q.id,hash:q.hash,version:q.version,idempotencyKey:randomUUID(),accepted:true});
  const hold=async(offset,count=1)=>{const q=await quote(first,offset,count);return createCheckoutHold(sql,first,input(q),env);};
  const evidence=(checkout,status='captured',id='pay_Fixture'+(++serial))=>{
    const payment={id,order_id:checkout.providerOrderId,amount:checkout.expectedMinor,currency:'INR',status,captured:status==='captured'};
    payments.set(id,payment);return payment;
  };
  const callback=(checkout,payment)=>({orderId:checkout.orderId,paymentId:payment.id,signature:sign(checkout.providerOrderId+'|'+payment.id)});
  const expire=order=>withListingInventory(sql,listing.id,tx=>expireInventoryHolds(tx,listing.id,new Date(new Date(order.holdExpiresAt).getTime()+1)));
  let winner;
  await check('disabled gate, strict ownership and concurrent last-space all-or-nothing holds',async()=>{
    const disabled=await quote();await fail(()=>createCheckoutHold(sql,first,input(disabled),env),'PAYMENTS_DISABLED');
    await config();
    const a=await quote(first,0,2),b=await quote(second,0,2);
    await fail(()=>createCheckoutHold(sql,second,input(a),env),'QUOTE_NOT_FOUND');
    const request=input(a),remote=connect();
    const results=await Promise.allSettled([createCheckoutHold(sql,first,request,env),createCheckoutHold(remote,second,input(b),env)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1,JSON.stringify(results.map(r=>r.status==='rejected'?{code:r.reason.code,message:r.reason.message,detail:r.reason.detail,stack:r.reason.stack}:r.status)));
    assert.equal(results.find(r=>r.status==='rejected').reason.code,'AVAILABILITY_CONFLICT');
    const result=results.find(r=>r.status==='fulfilled').value;
    const [scope]=await sql`SELECT customer_id FROM booking_order WHERE id=${result.orderId}`;
    winner={...result,session:scope.customer_id===first.userId?first:second,request:scope.customer_id===first.userId?request:null};
    assert.equal((await sql`SELECT count(*)::int n FROM booking_order`)[0].n,1);
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation WHERE state='held'`)[0].n,2);
    await assert.rejects(()=>readCheckoutStatus(sql,scope.customer_id===first.userId?second:first,result.orderId,env));
  });
  await check('idempotent replay, changed request rejection and immutable accepted terms',async()=>{
    const q=await quote(first,3),request=input(q);
    const [a,b]=await Promise.all([createCheckoutHold(sql,first,request,env),createCheckoutHold(connect(),first,request,env)]);
    assert.equal(a.orderId,b.orderId);
    await fail(()=>createCheckoutHold(sql,first,{...request,hash:'a'.repeat(64)},env),'IDEMPOTENCY_CONFLICT');
    await fail(()=>sql`UPDATE payment_execution SET credential_key_id='rzp_test_changed' WHERE payment_order_id=${a.paymentOrderId}`,'23514');
    await fail(()=>sql`UPDATE booking_order SET amount_rent_minor=1 WHERE id=${a.orderId}`,'23514');
    await assert.rejects(()=>createCheckoutHold(sql,{...first,sessionId:second.sessionId},input(q),env));
  });
  await check('owner blocks and overlapping overnight holds have one winner',async()=>{
    const q=await quote(first,6),request=input(q),visit=q.visits[0];
    const results=await Promise.allSettled([createCheckoutHold(sql,first,request,env),createOwnerBlock(connect(),owner.id,{rentableId:listing.id,blockedStartAt:visit.blockedStartAt,blockedEndAt:visit.blockedEndAt,reason:'Fixture race'})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const block=results[1].status==='fulfilled'?results[1].value:null;
    if(block) await releaseOwnerBlock(sql,owner.id,{rentableId:listing.id,blockId:block.id});
    const full=await quote(first,8,1,'full_day'),night=await quote(second,8,1,'night');
    const overlap=await Promise.allSettled([createCheckoutHold(sql,first,input(full),env),createCheckoutHold(connect(),second,input(night),env)]);
    assert.equal(overlap.filter(r=>r.status==='fulfilled').length,1);
  });
  await check('gateway changes block undispatched attempts; lost responses reuse one external order',async()=>{
    const checkout=await hold(10);await config(false);
    await fail(()=>startCheckoutPayment(sql,first,checkout.orderId,options),'PAYMENTS_DISABLED');
    await config();
    await fail(()=>startCheckoutPayment(sql,first,checkout.orderId,options),'GATEWAY_VERSION_CONFLICT');
    const pending=await hold(11);loseResponse=true;
    const before=calls.filter(c=>c.method==='POST').length;
    const unknown=await startCheckoutPayment(sql,first,pending.orderId,options);assert.equal(unknown.executionState,'unknown');
    await startCheckoutPayment(sql,first,pending.orderId,options);
    assert.equal(calls.filter(c=>c.method==='POST').length,before+1);
    await config(false);
    await reconcilePayment(sql,pending.paymentOrderId,options);
    const linked=await readCheckoutStatus(sql,first,pending.orderId,env);assert.ok(linked.providerOrderId);
    assert.equal(calls.filter(c=>c.method==='POST').length,before+1);
    const payment=evidence(linked);
    await verifyCheckoutPayment(sql,first,callback(linked,payment),options);
    assert.equal((await readCheckoutStatus(sql,first,pending.orderId,env)).state,'confirmed');
    await config();
  });
  await check('signatures, amounts, currency and order identity fail closed; authorization is not confirmation',async()=>{
    const held=await hold(13,2),before=calls.filter(c=>c.method==='POST').length;
    const probe=connect();
    beforePost=async()=>{
      await probe.begin(async tx=>{
        await tx`SELECT id FROM rentable WHERE id=${listing.id} FOR UPDATE NOWAIT`;
        await tx`SELECT id FROM booking_order WHERE id=${held.orderId} FOR UPDATE NOWAIT`;
        await tx`SELECT id FROM payment_order WHERE id=${held.paymentOrderId} FOR UPDATE NOWAIT`;
      });
      // A second request arrives while the first provider request is in flight.
      await startCheckoutPayment(probe,first,held.orderId,options);
    };
    await startCheckoutPayment(sql,first,held.orderId,options);
    beforePost=null;
    const checkout=await readCheckoutStatus(sql,first,held.orderId,env);
    assert.ok(checkout.providerOrderId,'Provider POST must run after inventory/order/payment locks are released');
    assert.equal(calls.filter(c=>c.method==='POST').length,before+1);
    const payment=evidence(checkout,'authorized');
    await fail(()=>verifyCheckoutPayment(sql,first,{...callback(checkout,payment),signature:'0'.repeat(64)},options),'INVALID_SIGNATURE');
    for(const bad of [{amount:1},{currency:'USD'},{order_id:'order_other'}]) {
      mismatch=bad;await fail(()=>verifyCheckoutPayment(sql,first,callback(checkout,payment),options),'PROVIDER_PAYMENT_MISMATCH');
    }
    mismatch=null;
    await verifyCheckoutPayment(sql,first,callback(checkout,payment),options);
    assert.equal((await readCheckoutStatus(sql,first,checkout.orderId,env)).state,'held');
    payment.status='captured';payment.captured=true;
    await Promise.all([verifyCheckoutPayment(sql,first,callback(checkout,payment),options),verifyCheckoutPayment(connect(),first,callback(checkout,payment),options)]);
    assert.equal((await sql`SELECT count(*)::int n FROM payment_transaction WHERE provider_payment_id=${payment.id} AND kind='capture'`)[0].n,1);
    assert.equal((await sql`SELECT count(*)::int n FROM booking WHERE order_id=${checkout.orderId} AND state='confirmed'`)[0].n,2);
    const extra=evidence(checkout);
    await fail(()=>verifyCheckoutPayment(sql,first,callback(checkout,extra),options),'EXTRA_CAPTURE_REQUIRES_REVIEW');
    await expire(checkout);
    assert.equal((await readCheckoutStatus(sql,first,checkout.orderId,env)).state,'confirmed');
  });
  await check('changed prices block first dispatch and failed payments never confirm',async()=>{
    const changed=await hold(25),before=calls.filter(c=>c.method==='POST').length;
    await sql`UPDATE rentable_price SET weekday=weekday+1 WHERE rentable_id=${listing.id} AND slot='day'`;
    await fail(()=>startCheckoutPayment(sql,first,changed.orderId,options),'QUOTE_CHANGED');
    assert.equal(calls.filter(c=>c.method==='POST').length,before);
    await sql`UPDATE rentable_price SET weekday=weekday-1 WHERE rentable_id=${listing.id} AND slot='day'`;
    const checkout=await startCheckoutPayment(sql,first,(await hold(26)).orderId,options),payment=evidence(checkout,'failed');
    await verifyCheckoutPayment(sql,first,callback(checkout,payment),options);
    assert.equal((await readCheckoutStatus(sql,first,checkout.orderId,env)).state,'held');
    assert.equal((await sql`SELECT count(*)::int n FROM payment_transaction WHERE provider_payment_id=${payment.id} AND kind='capture'`)[0].n,0);
  });
  await check('verified webhooks persist before processing; duplicates, old secrets and retries are safe',async()=>{
    const checkout=await startCheckoutPayment(sql,first,(await hold(16)).orderId,options),payment=evidence(checkout);
    const raw=Buffer.from(JSON.stringify({event:'payment.captured',payload:{payment:{entity:{...payment,contact:'PRIVATE',email:'private@fixture.invalid'}}}}));
    const id='evt_'+randomUUID(),signature=sign(raw,env.RAZORPAY_TEST_WEBHOOK_SECRET);
    await fail(()=>ingestRazorpayEvent(sql,raw,'0'.repeat(64),id,env),'INVALID_SIGNATURE');
    const event=await ingestRazorpayEvent(sql,raw,signature,id,env);
    assert.equal((await ingestRazorpayEvent(sql,raw,signature,id,env)).duplicate,true);
    await fail(()=>ingestRazorpayEvent(sql,Buffer.from('{}'),sign('{}',env.RAZORPAY_TEST_WEBHOOK_SECRET),id,env),'INVALID_EVENT');
    const [stored]=await sql`SELECT redacted_payload FROM payment_event WHERE id=${event.id}`;
    assert.ok(!JSON.stringify(stored).includes('PRIVATE'));assert.ok(!JSON.stringify(stored).includes('private@'));
    await config(false);
    mismatch={amount:1};await processNextPaymentEvent(sql,options);
    assert.equal((await sql`SELECT state FROM payment_event WHERE id=${event.id}`)[0].state,'failed');
    mismatch=null;await sql`UPDATE payment_event_job SET next_attempt_at=now() WHERE event_id=${event.id}`;
    await processNextPaymentEvent(sql,options);
    assert.equal((await readCheckoutStatus(sql,first,checkout.orderId,env)).state,'confirmed');
    const later=Buffer.from(JSON.stringify({event:'payment.failed',payload:{payment:{entity:payment}}}));
    await ingestRazorpayEvent(sql,later,sign(later,env.RAZORPAY_TEST_WEBHOOK_SECRET),'evt_'+randomUUID(),{...env,RAZORPAY_TEST_WEBHOOK_SECRET:'new-secret',RAZORPAY_TEST_PREVIOUS_WEBHOOK_SECRETS:JSON.stringify([env.RAZORPAY_TEST_WEBHOOK_SECRET])});
    await processNextPaymentEvent(sql,options);
    assert.equal((await readCheckoutStatus(sql,first,checkout.orderId,env)).state,'confirmed');
    await config();
  });
  await check('late capture after expiry and resale reserves a test refund without overbooking',async()=>{
    const checkout=await startCheckoutPayment(sql,first,(await hold(19)).orderId,options);
    await expire(checkout);
    const replacement=await hold(19);
    const payment=evidence(checkout);
    const resolved=await verifyCheckoutPayment(sql,first,callback(checkout,payment),options);
    assert.equal(resolved.needsResolution,true);assert.equal(resolved.state,'expired');
    const [refund]=await sql`SELECT r.* FROM refund r JOIN payment_transaction t ON t.id=r.transaction_id WHERE t.provider_payment_id=${payment.id}`;
    assert.equal(refund.state,'requested');assert.equal(Number(refund.actual_minor),0);
    await verifyCheckoutPayment(sql,first,callback(checkout,payment),options);
    assert.equal((await sql`SELECT count(*)::int n FROM refund WHERE transaction_id=${refund.transaction_id}`)[0].n,1);
    assert.equal((await readCheckoutStatus(sql,first,replacement.orderId,env)).state,'held');
  });
  await check('advance collections reconcile per visit and Test captures never fund revenue or payout',async()=>{
    await config(true,'advance');
    const checkout=await startCheckoutPayment(sql,first,(await hold(22,2)).orderId,options),payment=evidence(checkout);
    await verifyCheckoutPayment(sql,first,callback(checkout,payment),options);
    const [{n}]=await sql`SELECT sum(a.actual_minor)::text n FROM payment_allocation a JOIN payment_transaction t ON t.id=a.transaction_id WHERE t.provider_payment_id=${payment.id}`;
    assert.equal(Number(n),checkout.expectedMinor);
    assert.equal((await ownerFinancialSummary(sql,owner.id)).captured_minor,'0');
    assert.deepEqual(await ownerPayoutSources(sql,owner.id),[]);
    assert.equal((await sql`SELECT sum(collected_minor)::text n FROM booking_order`)[0].n,'0');
    await sql`UPDATE customer_session SET revoked_at=now() WHERE id=${first.sessionId}`;
    await assert.rejects(()=>readCheckoutStatus(sql,first,checkout.orderId,env));
  });
  await check('worker tick is repeatable and lifecycle hooks remain append-only',async()=>{
    await runPaymentJobs(sql,options);await runPaymentJobs(sql,options);
    await fail(()=>sql`UPDATE booking_lifecycle_event SET payload='{}'::jsonb WHERE kind='confirmed'`,'23514');
    assert.ok(winner.orderId);
  });
});
console.log(`Part 11: ${passed} groups passed; disposable database removed. Provider HTTP responses were deterministic fixtures, not bank transactions.`);
