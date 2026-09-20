import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { recordVisitTransition } from '../lib/booking/visit-lifecycle.js';
import { submitReview,reviewOrder,moderateReview,replyToReview,reportReview,closeReviewReport,reviewQueue } from '../lib/reviews/service.js';
const env={NODE_ENV:'test'};
let passed=0;
async function check(label,run){await run();passed++;console.log('PASS '+label);}
const fail=(run,code)=>assert.rejects(run,e=>e.code===code);
await withDisposableDatabase('p16',async({sql,connect,databaseUrl})=>{
  const [owner, otherOwner, customer, otherCustomer] = await sql`INSERT INTO "user"(role,name,phone,phone_verified_at,account_status)
    VALUES('client','Lifecycle host','9000015001',now(),'active'),('client','Other host','9000015002',now(),'active'),
      ('customer','Lifecycle guest','9000015003',now(),'active'),('customer','Other guest','9000015004',now(),'active') RETURNING id`;
  const [session, otherSession] = await sql`INSERT INTO customer_session(user_id,expires_at) VALUES(${customer.id},now()+interval '1 day'),(${otherCustomer.id},now()+interval '1 day') RETURNING id`;
  await sql`INSERT INTO customer_profile(user_id,completed_at) VALUES(${customer.id},now()),(${otherCustomer.id},now())`;
  const actor = { kind: 'customer', session: { role: 'customer', userId: customer.id, sessionId: session.id, development: true } };
  const stranger = { kind: 'customer', session: { role: 'customer', userId: otherCustomer.id, sessionId: otherSession.id, development: true } };
  const [admin] = await sql`INSERT INTO admin_user(email,name,password_hash) VALUES('lifecycle@fixture.invalid','Lifecycle admin','unused') RETURNING id`;
  const host = { kind: 'owner', id: owner.id }, staff = { kind: 'admin', id: admin.id };
  const [city] = await sql`INSERT INTO city(slug,name,state) VALUES('lifecycle','Lifecycle','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area(city_id,slug,name) VALUES(${city.id},'lifecycle','Lifecycle') RETURNING id`;
  const [category] = await sql`INSERT INTO category(slug,name,form,default_rental_unit) VALUES('lifecycle','Lifecycle','fixed','slot') RETURNING id`;
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
  async function complete(f) {
    for(const [i,phase] of ['handover','return','complete'].entries()) await recordVisitTransition(sql,host,{visitId:f.visitId,phase,expectedVersion:f.version+i,
      occurredAt:new Date(+f.start+60000*(i+1)).toISOString(),note:'The host observed the guest and checked the property.',attested:true,requestKey:randomUUID()});
    return f;
  }
  const real=await complete(await fixture('real')), low=await complete(await fixture('real'));
  const input=(f,rating=5)=>({visitId:f.visitId,rating,body:'The property matched our visit and this is my honest experience.',cleanliness:4,accuracy:null,valueForMoney:3});
  let highReview,lowReview;
  await check('completed actual evidence only; no wrong customer, incomplete, cancelled, test or seed reviews',async()=>{
    await fail(()=>submitReview(sql,stranger.session,input(real),env),'NOT_ELIGIBLE');
    for(const f of [await fixture('real'),await complete(await fixture('test')),await complete(await fixture('seed'))]) await fail(()=>submitReview(sql,actor.session,input(f),env),'NOT_ELIGIBLE');
    const cancelled=await fixture('real');await sql`UPDATE booking SET state='cancelled' WHERE id=${cancelled.visitId}`;
    await fail(()=>submitReview(sql,actor.session,input(cancelled),env),'NOT_ELIGIBLE');
    await assert.rejects(()=>submitReview(sql,actor.session,{...input(real),rating:6},env));
    await assert.rejects(()=>submitReview(sql,actor.session,{...input(real),cleanliness:0},env));
    await fail(()=>sql`INSERT INTO review(booking_id,rentable_id,author_id,author_role,rating,body) VALUES(${cancelled.visitId},${listing.id},${customer.id},'customer',5,'Bypass attempt')`,'23514');
  });
  await check('concurrent submission is replay-safe, changed duplicate rejected and all scores await moderation',async()=>{
    const [a,b]=await Promise.all([submitReview(sql,actor.session,input(real),env),submitReview(connect(),actor.session,input(real),env)]);
    assert.equal(a.id,b.id);highReview=a.id;
    await fail(()=>submitReview(sql,actor.session,input(real,1),env),'ALREADY_REVIEWED');
    lowReview=(await submitReview(sql,actor.session,input(low,1),env)).id;
    assert.equal((await sql`SELECT count(*)::int n FROM public_customer_review`)[0].n,0);
    const data=await reviewOrder(sql,actor.session,real.id,env);assert.equal(data.visits[0].moderation_state,'pending');
    await fail(()=>reviewOrder(sql,stranger.session,real.id,env),'NOT_FOUND');
    await fail(()=>sql`UPDATE review SET rating=1 WHERE id=${highReview}`,'23514');
  });
  const decision=async(id,state='published')=>{
    const [r]=await sql`SELECT version FROM review WHERE id=${id}`;
    return moderateReview(sql,admin.id,{id,version:r.version,state,reason:'Reviewed under the same content rules, regardless of score.'});
  };
  await check('score-neutral publication, evidence independent of Test payment, exact public aggregates',async()=>{
    await sql`INSERT INTO payment_order(booking_order_id,provider,environment,mode,currency,purpose,expected_minor,idempotency_key,request_hash,state)
      VALUES(${real.id},'razorpay','test','real','INR','full',10800,'review-test-payment',${'a'.repeat(64)},'created')`;
    await fail(()=>moderateReview(sql,randomUUID(),{id:highReview,version:0,state:'published',reason:'Unauthorized moderator attempt'}),'FORBIDDEN');
    await decision(highReview);await decision(lowReview);
    const [r]=await sql`SELECT rating_avg,review_count FROM rentable WHERE id=${listing.id}`;
    assert.equal(r.review_count,2);assert.equal(r.rating_avg,3);
    assert.equal((await sql`SELECT count(*)::int n FROM public_customer_review`)[0].n,2);
    await sql`UPDATE rentable SET rating_avg=5,review_count=900 WHERE id=${listing.id}`;
    assert.equal((await sql`SELECT review_count FROM rentable WHERE id=${listing.id}`)[0].review_count,2);
    await decision(highReview,'hidden');assert.equal((await sql`SELECT rating_avg FROM rentable WHERE id=${listing.id}`)[0].rating_avg,1);
    await decision(highReview);await decision(lowReview,'rejected');
    assert.equal((await sql`SELECT rating_avg FROM rentable WHERE id=${listing.id}`)[0].rating_avg,5);
    await decision(lowReview);
    await fail(()=>moderateReview(sql,admin.id,{id:highReview,version:0,state:'hidden',reason:'Stale moderator version test'}),'CHANGED');
  });
  await check('owner replies and reports scoped, deduplicated and audited without suppressing criticism',async()=>{
    const [r]=await sql`SELECT version FROM review WHERE id=${lowReview}`;
    await fail(()=>replyToReview(sql,otherOwner.id,{id:lowReview,version:r.version,body:'Unrelated owner reply.'}),'FORBIDDEN');
    await replyToReview(sql,owner.id,{id:lowReview,version:r.version,body:'Thank you for sharing your experience. We will address this.'});
    const report=await reportReview(sql,actor,{id:lowReview,reason:'Please check this reply for a possible policy violation.'},env);
    assert.equal((await reportReview(sql,actor,{id:lowReview,reason:'Repeated report should keep the original reference.'},env)).id,report.id);
    await fail(()=>reportReview(sql,{kind:'owner',id:otherOwner.id},{id:lowReview,reason:'Unrelated owner report.'},env),'FORBIDDEN');
    assert.equal((await sql`SELECT count(*)::int n FROM public_customer_review`)[0].n,2);
    const queue=await reviewQueue(sql,staff);assert.equal(queue.reports.length,1);assert.ok(!JSON.stringify(queue).includes('9000015003'));
    await closeReviewReport(sql,admin.id,{id:report.id,resolution:'Reviewed the report; no policy violation found.'});
    assert.equal((await reviewQueue(sql,staff)).reports.length,0);
    assert.ok((await sql`SELECT count(*)::int n FROM audit_log WHERE entity IN ('review','review_report')`)[0].n>=8);
  });
  await check('loss of visit eligibility removes public rating, guest-targeted feedback never contributes',async()=>{
    await sql`UPDATE booking SET state='disputed' WHERE id=${real.visitId}`;
    const [r]=await sql`SELECT rating_avg,review_count FROM rentable WHERE id=${listing.id}`;
    assert.equal(r.review_count,1);assert.equal(r.rating_avg,1);
    await fail(()=>decision(highReview),'NOT_ELIGIBLE');
    await sql`INSERT INTO review(booking_id,rentable_id,author_id,author_role,rating,body) VALUES(${low.visitId},${listing.id},${owner.id},'client',5,'Private guest feedback stays separate.')`;
    assert.equal((await sql`SELECT review_count FROM rentable WHERE id=${listing.id}`)[0].review_count,1);
  });
  if(process.env.CUSTOMER_BROWSER_DRIVER){
    const browserVisit=await complete(await fixture('real'));
    const {verifyReviewBrowser}=await import('./lib/customer-reviews-browser.mjs');
    await check('mobile submission, status, moderation, owner reply and public report',()=>verifyReviewBrowser({databaseUrl,actor,owner,admin,target:browserVisit,sql,listing}));
  }
  await check('revoked customer and inactive staff are rejected',async()=>{
    await sql`UPDATE customer_session SET revoked_at=now() WHERE id=${session.id}`;
    await assert.rejects(()=>reviewOrder(sql,actor.session,real.id,env));
    await sql`UPDATE admin_user SET is_active=false WHERE id=${admin.id}`;
    await fail(()=>reviewQueue(sql,staff),'FORBIDDEN');
  });
});
console.log(`Part 16: ${passed} groups passed; disposable database removed. No provider requests.`);
