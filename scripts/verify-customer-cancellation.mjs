import { previewCancellation, commitCancellation } from '../lib/booking/cancellation.js';
import { reconcileRefund, runRefundJobs } from '../lib/payments/refunds.js';
import { cancellationEntitlement } from '../lib/domain/cancellation.js';
import { readBookingRecord } from '../lib/booking/records.js';
import assert from 'node:assert/strict';
import { readOperations } from '../lib/operations/overview.js';
import { randomUUID, createHmac } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { createBookingQuote } from '../lib/booking/quotes.js';
import { readCheckoutReview, readOwnedCheckoutReview } from '../lib/booking/checkout-review.js';
import { checkoutMessage, mayLaunchCheckout } from '../lib/domain/checkout-display.js';
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
const orders=new Map(),payments=new Map(),calls=[],refunds=new Map();
let loseRefund=false,refundStatus='processed',wrongRefund=false,refundHook=null;
const fetcher=async(url,options)=>{
  const route=new URL(url);calls.push({path:route.pathname,method:options.method});
  assert.ok(url.startsWith('https://api.razorpay.com/v1/'));
  if(route.pathname.includes('/refund')) {
    if(options.method==='POST') {
      if(refundHook) await refundHook();
      const body=JSON.parse(options.body),result={...body,id:'rfnd_Fixture'+(++serial),payment_id:route.pathname.split('/')[3],currency:'INR',status:refundStatus};
      refunds.set(result.id,result);
      if(loseRefund){loseRefund=false;throw new Error('Lost refund response');}
      return Response.json(result);
    }
    if(route.pathname.startsWith('/v1/refunds/')) {
      const result=refunds.get(route.pathname.split('/').at(-1));
      return Response.json(wrongRefund?{...result,amount:1}:result);
    }
    return Response.json({items:[...refunds.values()].filter(r=>r.payment_id===route.pathname.split('/')[3])});
  }
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

await withDisposableDatabase('p14',async({sql,connect,databaseUrl})=>{
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
  await config();
  const confirmed=async(offset,count=3)=>{
    const c=await startCheckoutPayment(sql,first,(await hold(offset,count)).orderId,options);
    const payment=evidence(c);await verifyCheckoutPayment(sql,first,callback(c,payment),options);
    const visits=await sql`SELECT id,state,starts_at,policy_snapshot FROM booking WHERE order_id=${c.orderId} ORDER BY item_position`;
    return {...c,visits};
  };
  const cancelInput=(c,p,ids=p.visits.map(v=>v.id))=>({orderId:c.orderId,visitIds:ids,hash:p.hash,accepted:true,idempotencyKey:randomUUID(),reason:'Changed plans'});
  let booked,cancelled;
  await check('versioned cutoff boundaries and integer partial refunds',async()=>{
    const visit={policy_snapshot:{version:'customer-v1',cancellationTier:'moderate'},hours_known:true,starts_at:'2026-12-10T03:30:00Z',amount_rent_minor:10001,amount_fee_minor:800,amount_deposit_minor:1000};
    assert.equal(cancellationEntitlement(visit,'2026-12-03T03:30:00Z').rent,10001);
    assert.equal(cancellationEntitlement(visit,'2026-12-03T03:30:00.001Z').rent,5000);
    assert.equal(cancellationEntitlement(visit,'2026-12-07T03:30:00.001Z').rent,0);
    assert.throws(()=>cancellationEntitlement(visit,visit.starts_at),/VISIT_STARTED/);
    assert.throws(()=>cancellationEntitlement({...visit,policy_snapshot:{version:'unknown'}},'2026-12-01'),/POLICY_UNSUPPORTED/);
  });
  await check('one of three cancellations release only the selected visit and replay once',async()=>{
    booked=await confirmed(0);const ids=[booked.visits[1].id];
    const preview=await previewCancellation(sql,first,{orderId:booked.orderId,visitIds:ids},env);
    await fail(()=>previewCancellation(sql,second,{orderId:booked.orderId,visitIds:ids},env),'CHECKOUT_NOT_FOUND');
    await fail(()=>previewCancellation(sql,first,{orderId:booked.orderId,visitIds:[randomUUID()]},env),'VISIT_NOT_FOUND');
    const request=cancelInput(booked,preview);
    const results=await Promise.all([commitCancellation(sql,first,request,env),commitCancellation(connect(),first,request,env)]);
    assert.equal(results[0].id,results[1].id);cancelled=results[0];
    const visits=await sql`SELECT state FROM booking WHERE order_id=${booked.orderId} ORDER BY item_position`;
    assert.deepEqual(visits.map(v=>v.state),['confirmed','cancelled','confirmed']);
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation WHERE booking_id IN (SELECT id FROM booking WHERE order_id=${booked.orderId}) AND state='committed'`)[0].n,2);
    assert.equal((await readCheckoutStatus(sql,first,booked.orderId,env)).state,'confirmed');
    await fail(()=>commitCancellation(sql,first,{...request,reason:'different'},env),'IDEMPOTENCY_CONFLICT');
    await fail(()=>sql`UPDATE booking_cancellation SET snapshot='{}'::jsonb WHERE id=${cancelled.id}`,'23514');
    await fail(()=>commitCancellation(sql,first,{...request,idempotencyKey:randomUUID()},env),'VISIT_NOT_CANCELLABLE');
  });
  await check('refund unknown response, no network under locks, disabled gateway and single dispatch',async()=>{
    await config(false);loseRefund=true;
    const id=cancelled.refundIds[0],probe=connect();
    refundHook=async()=>probe.begin(async tx=>{await tx`SELECT id FROM rentable WHERE id=${listing.id} FOR UPDATE NOWAIT`;await tx`SELECT id FROM refund WHERE id=${id} FOR UPDATE NOWAIT`;});
    await fail(()=>reconcileRefund(sql,id,options),'PROVIDER_OUTCOME_UNKNOWN');refundHook=null;
    assert.equal((await sql`SELECT state FROM refund WHERE id=${id}`)[0].state,'unknown');
    await Promise.all([reconcileRefund(sql,id,options),reconcileRefund(connect(),id,options)]);
    assert.equal((await sql`SELECT state FROM refund WHERE id=${id}`)[0].state,'succeeded');
    assert.equal(calls.filter(c=>c.method==='POST'&&c.path.endsWith('/refund')).length,1);
    assert.equal((await ownerFinancialSummary(sql,owner.id)).refunded_minor,'0');
    await fail(()=>sql`UPDATE refund_execution SET dispatched_at=NULL WHERE refund_id=${id}`,'23514');
    await config();
  });
  await check('failed/pending provider refunds retain the cap and recover without another POST',async()=>{
    const ids=[booked.visits[0].id];const preview=await previewCancellation(sql,first,{orderId:booked.orderId,visitIds:ids},env);
    const receipt=await commitCancellation(sql,first,cancelInput(booked,preview),env);const id=receipt.refundIds[0];
    refundStatus='failed';await reconcileRefund(sql,id,options);
    assert.equal((await sql`SELECT state FROM refund WHERE id=${id}`)[0].state,'unknown');
    const remote=[...refunds.values()].find(r=>r.receipt===id);remote.status='pending';await reconcileRefund(sql,id,options);
    assert.equal((await sql`SELECT actual_minor FROM refund WHERE id=${id}`)[0].actual_minor,'0');
    remote.status='processed';wrongRefund=true;await fail(()=>reconcileRefund(sql,id,options),'PROVIDER_REFUND_MISMATCH');wrongRefund=false;
    await reconcileRefund(sql,id,options);await reconcileRefund(sql,id,options);
    assert.equal(calls.filter(c=>c.method==='POST'&&c.path.endsWith('/refund')).length,2);
    refundStatus='processed';
  });
  await check('full cancellation removes arrival access and replayed refund webhooks are safe',async()=>{
    const preview=await previewCancellation(sql,first,{orderId:booked.orderId,visitIds:[booked.visits[2].id]},env);
    const receipt=await commitCancellation(sql,first,cancelInput(booked,preview),env);
    const record=await readBookingRecord(sql,{kind:'customer',session:first},booked.orderId,env);
    assert.equal(record.state,'cancelled');assert.equal(record.arrival,null);
    await runRefundJobs(sql,options);
    const remote=[...refunds.values()].find(r=>r.receipt===receipt.refundIds[0]);assert.ok(remote);
    const raw=Buffer.from(JSON.stringify({event:'refund.processed',payload:{refund:{entity:{...remote,notes:{private:'DO_NOT_STORE'}}}}}));
    const event=await ingestRazorpayEvent(sql,raw,sign(raw,env.RAZORPAY_TEST_WEBHOOK_SECRET),'refund_event_fixture',env);
    await ingestRazorpayEvent(sql,raw,sign(raw,env.RAZORPAY_TEST_WEBHOOK_SECRET),'refund_event_fixture',env);
    await processNextPaymentEvent(sql,options);
    assert.equal((await sql`SELECT state FROM payment_event WHERE id=${event.id}`)[0].state,'processed');
    assert.ok(!JSON.stringify((await sql`SELECT redacted_payload FROM payment_event WHERE id=${event.id}`)[0]).includes('DO_NOT_STORE'));
  });
  await check('advance collection refunds are capped to paid components and changed estimates need acceptance',async()=>{
    await config(true,'advance');const c=await confirmed(5,1);
    const p=await previewCancellation(sql,first,{orderId:c.orderId,visitIds:[c.visits[0].id]},env);
    assert.ok(p.refundMinor<=c.expectedMinor);assert.equal(p.visits[0].deposit,200000);
    await fail(()=>commitCancellation(sql,first,{...cancelInput(c,p),hash:'a'.repeat(64)},env),'CANCELLATION_CHANGED');
    const result=await commitCancellation(sql,first,cancelInput(c,p),env);await reconcileRefund(sql,result.refundIds[0],options);
    assert.equal((await sql`SELECT actual_minor FROM refund WHERE id=${result.refundIds[0]}`)[0].actual_minor,String(p.refundMinor));
  });
  await check('operations reconciles Test refunds without multiplying capture totals or live money', async () => {
    const data = await readOperations(sql, admin.id, env);
    const test = data.money.find(row => row.environment === 'test');
    const [ledger] = await sql`SELECT sum(actual_minor)::text n FROM refund WHERE environment='test' AND state='succeeded'`;
    assert.equal(test.refunded_minor, ledger.n);
    assert.ok(BigInt(test.refunded_minor) > 0n);
    assert.ok(Object.values(data.live).every(value => value === '0'));
  });
  if(process.env.CUSTOMER_BROWSER_DRIVER) await check('mobile cancellation preview, acceptance, receipt and remaining visits',async()=>{
    await config();const c=await confirmed(8,3);
    await sql`INSERT INTO customer_profile(user_id) VALUES(${first.userId}) ON CONFLICT DO NOTHING`;
    const {verifyCancellationBrowser}=await import('./lib/customer-cancellation-browser.mjs');
    await verifyCancellationBrowser({databaseUrl,session:first,orderId:c.orderId});
  });
  else console.log('SKIP cancellation browser: set CUSTOMER_BROWSER_DRIVER for the full Part 14 UI gate. Database regression checks only.');
});
console.log(`Cancellation ${process.env.CUSTOMER_BROWSER_DRIVER ? 'database + browser' : 'database-only'}: ${passed} groups passed; disposable database removed. Provider refunds use deterministic HTTP fixtures.`);
