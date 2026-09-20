import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { recordVisitTransition } from '../lib/booking/visit-lifecycle.js';
import { readBookingRecord } from '../lib/booking/records.js';
import { quoteBookAgain } from '../lib/booking/book-again.js';
import { bookingCalendar } from '../lib/domain/booking-calendar.js';
import { notificationMessage } from '../lib/domain/notifications.js';
import { processNotification, runNotificationJobs } from '../lib/notifications/jobs.js';
import { customerNotifications, markNotificationRead, notificationMonitor, retryNotification, reconcileUnknownNotification } from '../lib/notifications/records.js';
import { addLocalDays, propertyToday } from '../lib/domain/booking-dates.js';

let passed = 0;
const browserOnly = process.argv.includes('--browser-only');
if (browserOnly && !process.env.CUSTOMER_BROWSER_DRIVER) throw new Error('Browser-only verification requires CUSTOMER_BROWSER_DRIVER');
async function check(label, run) {
  if (browserOnly && !label.startsWith('390px browser') && !label.startsWith('inactive staff')) return;
  await run(); console.log('PASS ' + label); passed++;
}
const fail = (run, code) => assert.rejects(run, error => error.code === code);
const env = { NODE_ENV: 'test', CUSTOMER_NOTIFICATION_DELIVERY: 'twilio', CUSTOMER_NOTIFICATION_ALLOW_TEST_SMS: 'true',
  TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32), TWILIO_AUTH_TOKEN: 'fixture-only', TWILIO_FROM_NUMBER: '+15005550006' };
const messages = new Map(), calls = []; let serial = 0, lose = false, reject = false, mismatch = false, beforePost;
const fetcher = async (url, options) => {
  assert.ok(url.startsWith(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages`));
  calls.push(options.method);
  if (options.method === 'POST') {
    if (beforePost) await beforePost();
    if (reject) return Response.json({ code: 20429 }, { status: 429 });
    const form = options.body;
    const result = { sid: 'SM' + (++serial).toString(16).padStart(32, '0'), account_sid: env.TWILIO_ACCOUNT_SID,
      to: form.get('To'), from: form.get('From'), body: form.get('Body'), status: 'queued' };
    messages.set(result.sid, result);
    if (lose) { lose = false; throw new Error('Lost response after dispatch'); }
    return Response.json(result);
  }
  const sid = new URL(url).pathname.split('/').at(-1).replace('.json', '');
  const result = messages.get(sid);
  return Response.json(mismatch ? { ...result, to: '+919999999999' } : result);
};
const options = { env, fetcher };

await check('calendar UTC overnight boundaries, escaped Unicode folding, stable IDs and privacy', async () => {
  const record = { title: 'Pool, roof; \\ test\n' + '\u0ab0'.repeat(70), reference: 'CAL-15', timeZone: 'Asia/Kolkata', createdAt: '2026-09-20T00:00:00Z',
    arrival: { address: 'PRIVATE ADDRESS' }, contact: { phone: '9000015003' }, payments: [{ environment: 'test' }],
    visits: [{ id: randomUUID(), reference: 'NIGHT-15', startsAt: '2026-09-20T13:30:00Z', endsAt: '2026-09-21T02:30:00Z', state: 'confirmed', version: 3 }] };
  const cal = bookingCalendar(record), unfolded = cal.replace(/\r\n /g, '');
  assert.match(cal, /DTSTART:20260920T133000Z\r\nDTEND:20260921T023000Z/);
  assert.match(unfolded, /Pool\\, roof\\; \\\\ test\\n/); assert.match(cal, /SEQUENCE:3/);
  assert.ok(cal.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.ok(!cal.includes('PRIVATE ADDRESS') && !cal.includes('9000015003'));
  assert.match(unfolded, /Test payment/); assert.equal(bookingCalendar(record), cal);
  record.visits[0].state = 'cancelled'; record.visits[0].version++;
  assert.match(bookingCalendar(record), /STATUS:CANCELLED/);
  record.visits[0].startsAt = null; assert.ok(!bookingCalendar(record).includes('BEGIN:VEVENT'));
});

await withDisposableDatabase('p15', async ({ sql, connect, databaseUrl }) => {
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
  const real = await fixture('real'), simulated = await fixture(), upcoming = await fixture('test', 12), browserVisit = await fixture();
  const input = (f, phase = 'handover', version = f.version, at = new Date(+f.start + 60000)) => ({ visitId: f.visitId, phase, expectedVersion: version, occurredAt: at.toISOString(), note: 'Operator observed the guest and checked the property.', attested: true, requestKey: randomUUID() });
  const notify = async f => { await sql`INSERT INTO booking_lifecycle_event(order_id,kind,payload) VALUES(${f.id},'confirmed','{}') ON CONFLICT DO NOTHING`; };
  const message = async (f, template = 'confirmation') => (await sql`SELECT * FROM notification_outbox WHERE order_id=${f.id} AND template=${template}`)[0];
  const due = id => sql`UPDATE notification_outbox SET next_attempt_at=now()-interval '1 second',lease_until=NULL WHERE id=${id}`;
  await check('transactional outbox rollback, deduplicated confirmations and per-visit reminders', async () => {
    await assert.rejects(() => sql.begin(async tx => { await tx`INSERT INTO booking_lifecycle_event(order_id,kind,payload) VALUES(${real.id},'confirmed','{}')`; throw new Error('rollback'); }));
    assert.equal((await sql`SELECT count(*)::int n FROM notification_outbox`)[0].n, 0);
    await notify(upcoming); await notify(upcoming); await notify(real); await notify(simulated);
    assert.equal((await sql`SELECT count(*)::int n FROM notification_outbox WHERE order_id=${upcoming.id}`)[0].n, 2);
    assert.equal((await sql`SELECT count(*)::int n FROM notification_outbox WHERE order_id=${real.id} AND template='reminder'`)[0].n, 0);
    await fail(() => sql`INSERT INTO notification_outbox(order_id,customer_id,event_key,template,scheduled_at) VALUES(${real.id},${otherCustomer.id},'bad','confirmation',now())`, '23514');
    await fail(() => sql`UPDATE notification_outbox SET template='refund' WHERE order_id=${real.id}`, '23514');
  });
  await check('strict operator scope, time, version and no automatic completion', async () => {
    const request = input(real);
    for (const who of [actor, { kind: 'owner', id: otherOwner.id }, { kind: 'admin', id: randomUUID() }]) await fail(() => recordVisitTransition(sql, who, request), 'OPERATOR_REQUIRED');
    await fail(() => recordVisitTransition(sql, host, input(real, 'complete')), 'VISIT_CHANGED');
    await fail(() => recordVisitTransition(sql, host, input(real, 'handover', real.version + 1)), 'VISIT_CHANGED');
    await fail(() => recordVisitTransition(sql, host, input(upcoming)), 'INVALID_EVIDENCE_TIME');
    await fail(() => recordVisitTransition(sql, host, input(real, 'handover', real.version, new Date(+real.start - 1))), 'INVALID_EVIDENCE_TIME');
    await fail(() => sql`UPDATE booking SET state='completed' WHERE id=${real.visitId}`, '23514');
    assert.equal((await sql`SELECT state FROM booking WHERE id=${real.visitId}`)[0].state, 'confirmed');
  });
  await check('concurrent idempotent handover, immutable evidence and chronological return/completion', async () => {
    const request = input(real);
    const [a, b] = await Promise.all([recordVisitTransition(sql, host, request), recordVisitTransition(connect(), host, request)]);
    assert.equal(a.id, b.id);
    await fail(() => recordVisitTransition(sql, host, { ...request, note: request.note + ' Changed.' }), 'IDEMPOTENCY_CONFLICT');
    await fail(() => sql`UPDATE visit_evidence SET note='Replacement operator evidence' WHERE id=${a.id}`, '23514');
    await fail(() => recordVisitTransition(sql, staff, input(real, 'return', real.version + 1, real.start)), 'PRIOR_EVIDENCE_REQUIRED');
    await recordVisitTransition(sql, staff, input(real, 'return', real.version + 1, new Date(+real.start + 120000)));
    await recordVisitTransition(sql, host, input(real, 'complete', real.version + 2, new Date(+real.start + 180000)));
    const record = await readBookingRecord(sql, actor, real.id, env);
    assert.equal(record.visits[0].reviewEligible, true); assert.equal(record.visits[0].evidence.length, 3);
    assert.ok(!JSON.stringify(record).includes('Operator observed'));
    assert.ok(JSON.stringify(await readBookingRecord(sql, host, real.id, env)).includes('Operator observed'));
    assert.equal((await message(real, 'review_invitation')).state, 'pending');
    assert.equal((await sql`SELECT state FROM booking_order WHERE id=${real.id}`)[0].state, 'confirmed');
    assert.equal((await sql`SELECT state FROM inventory_reservation WHERE booking_id=${real.visitId}`)[0].state, 'committed');
  });
  await check('Test payment does not prove a visit; actual evidence remains independent of payment environment', async () => {
    await sql`INSERT INTO payment_order(booking_order_id,provider,environment,mode,currency,purpose,expected_minor,idempotency_key,request_hash,state)
      VALUES(${real.id},'razorpay','test','real','INR','full',10800,'life-test-payment',${'a'.repeat(64)},'created')`;
    assert.equal((await readBookingRecord(sql, actor, real.id, env)).visits[0].reviewEligible, true);
    for (const f of [simulated, await fixture('seed')]) {
      for (const [n, phase] of ['handover','return','complete'].entries()) await recordVisitTransition(sql, host, input(f, phase, f.version + n));
      const visit = (await readBookingRecord(sql, actor, f.id, env)).visits[0];
      assert.equal(visit.reviewEligible, false); assert.ok(visit.evidence.every(e => e.nature === 'simulation'));
      assert.equal(await message(f, 'review_invitation'), undefined);
    }
  });
  await check('disabled delivery and Test SMS guards leave bookings intact and updates visible', async () => {
    const m = await message(simulated);
    await processNotification(sql, m.id, { env: {}, fetcher });
    assert.equal((await message(simulated)).state, 'blocked'); assert.equal(calls.length, 0);
    await due(m.id); await processNotification(sql, m.id, { env: { ...env, CUSTOMER_NOTIFICATION_ALLOW_TEST_SMS: 'false' }, fetcher });
    assert.equal((await message(simulated)).failure_code, 'TEST_SMS_DISABLED'); assert.equal(calls.length, 0);
    assert.equal((await sql`SELECT state FROM booking_order WHERE id=${simulated.id}`)[0].state, 'confirmed');
    const inbox = await customerNotifications(sql, actor.session, env);
    assert.ok(inbox.some(n => n.id === m.id)); assert.ok(inbox.filter(n => n.orderId === real.id).every(n => n.simulation));
    assert.equal((await customerNotifications(sql, stranger.session, env)).length, 0);
    await markNotificationRead(sql, stranger.session, m.id, env); assert.equal((await message(simulated)).read_at, null);
    await markNotificationRead(sql, actor.session, m.id, env); assert.ok((await message(simulated)).read_at);
  });
  await check('duplicate workers dispatch once; provider acceptance and confirmed delivery differ', async () => {
    const m = await message(simulated); await retryNotification(sql, admin.id, m.id);
    assert.equal((await sql`SELECT count(*)::int n FROM audit_log WHERE entity_id=${m.id} AND action='notification_retry'`)[0].n, 1);
    await Promise.all([processNotification(sql, m.id, options), processNotification(connect(), m.id, options)]);
    assert.equal(calls.filter(x => x === 'POST').length, 1);
    let current = await message(simulated); assert.equal(current.state, 'accepted'); assert.equal(current.delivered_at, null);
    assert.match(messages.get(current.provider_id).body, /Test \/ simulation/);
    await due(m.id); messages.get(current.provider_id).status = 'delivered'; await processNotification(sql, m.id, options);
    current = await message(simulated); assert.equal(current.state, 'delivered'); assert.ok(current.delivered_at);
    assert.equal(calls.filter(x => x === 'POST').length, 1);
  });
  await check('definite provider rejection retries without booking rollback and network runs outside locks', async () => {
    const m = await message(real), probe = connect(); reject = true;
    beforePost = () => probe.begin(async tx => { await tx`SELECT id FROM rentable WHERE id=${listing.id} FOR UPDATE NOWAIT`; await tx`SELECT id FROM notification_outbox WHERE id=${m.id} FOR UPDATE NOWAIT`; });
    await processNotification(sql, m.id, options); assert.equal((await message(real)).state, 'retry');
    reject = false; await retryNotification(sql, admin.id, m.id); await processNotification(sql, m.id, options); beforePost = null;
    assert.equal((await message(real)).state, 'accepted');
    assert.equal((await sql`SELECT state FROM booking_order WHERE id=${real.id}`)[0].state, 'confirmed');
  });
  await check('uncertain POST never repeats; staff reconcile only the exact pinned provider message', async () => {
    const m = await message(upcoming); lose = true;
    const before = calls.filter(x => x === 'POST').length;
    await processNotification(sql, m.id, options); assert.equal((await message(upcoming)).state, 'unknown');
    await due(m.id); await processNotification(sql, m.id, options); assert.equal(calls.filter(x => x === 'POST').length, before + 1);
    await assert.rejects(() => retryNotification(sql, admin.id, m.id));
    const sid = [...messages.keys()].at(-1); mismatch = true;
    await fail(() => reconcileUnknownNotification(sql, admin.id, m.id, sid, options), 'DELIVERY_SCOPE_MISMATCH'); mismatch = false;
    await assert.rejects(() => reconcileUnknownNotification(sql, randomUUID(), m.id, sid, options));
    await reconcileUnknownNotification(sql, admin.id, m.id, sid, options);
    assert.equal((await message(upcoming)).state, 'accepted');
    assert.equal((await sql`SELECT count(*)::int n FROM audit_log WHERE entity_id=${m.id} AND action='notification_reconciled'`)[0].n, 1);
    await due(m.id); messages.get(sid).status = 'undelivered'; await processNotification(sql, m.id, options);
    assert.equal((await message(upcoming)).state, 'undelivered');
    assert.equal(calls.filter(x => x === 'POST').length, before + 1);
  });
  await check('cancellation suppresses queued reminders; stale dispatch lease is uncertain, never resent', async () => {
    const reminder = await message(upcoming, 'reminder');
    await sql.begin(async tx => { await tx`UPDATE booking SET state='cancelled',cancelled_at=now() WHERE id=${upcoming.visitId}`;
      await tx`UPDATE inventory_reservation SET state='released',released_at=now() WHERE booking_id=${upcoming.visitId}`;
      await tx`INSERT INTO booking_lifecycle_event(order_id,kind,payload) VALUES(${upcoming.id},${'cancel_' + randomUUID().replaceAll('-','')},'{}')`; });
    assert.equal((await message(upcoming, 'reminder')).state, 'suppressed');
    const before = calls.length; await processNotification(sql, reminder.id, options); assert.equal(calls.length, before);
    const f = await fixture(); await notify(f); const m = await message(f);
    await sql`UPDATE notification_outbox SET state='sending',lease_token=${randomUUID()},lease_until=now()-interval '1 minute' WHERE id=${m.id}`;
    await processNotification(sql, m.id, options); assert.equal((await message(f)).state, 'unknown'); assert.equal(calls.length, before);
    assert.ok(!(await customerNotifications(sql, actor.session, env)).some(n => n.id === reminder.id));
  });
  await check('worker suppresses obsolete reminders even without an event and admin monitor keeps private payloads out', async () => {
    const f = await fixture('test', 2); await notify(f);
    await sql`UPDATE booking SET state='cancelled' WHERE id=${f.visitId}`;
    await sql`UPDATE inventory_reservation SET state='released',released_at=now() WHERE booking_id=${f.visitId}`;
    await runNotificationJobs(sql, { env: {}, fetcher });
    assert.equal((await message(f, 'reminder')).state, 'suppressed');
    const monitor = await notificationMonitor(sql, admin.id); assert.ok(monitor.counts.length);
    const serialized = JSON.stringify(monitor); assert.ok(!serialized.includes('9000015003') && !serialized.includes(env.TWILIO_AUTH_TOKEN));
    await assert.rejects(() => notificationMonitor(sql, randomUUID()));
  });
  const newDay = addLocalDays(propertyToday(), 20);
  await check('Book again rechecks ownership, dates, current rates, capacity, calendar and listing state', async () => {
    const [{ n: reservationsBefore }] = await sql`SELECT count(*)::int n FROM inventory_reservation`;
    const selection = { dates: [newDay], slot: 'day', guests: 5 };
    await sql`INSERT INTO availability(rentable_id,day,slot,units_available,blocked_by_client) VALUES(${listing.id},${newDay},'day',1,false)`;
    await assert.rejects(() => quoteBookAgain(sql, stranger.session, real.id, selection, env));
    const quote = await quoteBookAgain(sql, actor.session, real.id, selection, env);
    assert.equal(quote.totals.rentMinor, 250000); assert.equal(quote.visits[0].date, newDay);
    await sql`UPDATE rentable_price SET weekday=2700,weekend=2700 WHERE rentable_id=${listing.id} AND slot='day'`;
    assert.equal((await quoteBookAgain(sql, actor.session, real.id, selection, env)).totals.rentMinor, 270000);
    await fail(() => quoteBookAgain(sql, actor.session, real.id, { ...selection, guests: 13 }, env), 'CAPACITY_EXCEEDED');
    await sql`UPDATE availability SET blocked_by_client=true WHERE rentable_id=${listing.id}`;
    await fail(() => quoteBookAgain(sql, actor.session, real.id, selection, env), 'AVAILABILITY_CONFLICT');
    await sql`UPDATE availability SET blocked_by_client=false WHERE rentable_id=${listing.id}`;
    await sql`UPDATE rentable SET status='paused' WHERE id=${listing.id}`;
    await fail(() => quoteBookAgain(sql, actor.session, real.id, selection, env), 'LISTING_UNAVAILABLE');
    await sql`UPDATE rentable SET status='live' WHERE id=${listing.id}`;
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation`)[0].n, reservationsBefore);
  });
  if (process.env.CUSTOMER_BROWSER_DRIVER) {
    if (browserOnly) {
      await sql`INSERT INTO availability(rentable_id,day,slot,units_available,blocked_by_client) VALUES(${listing.id},${newDay},'day',1,false)`;
      await sql`UPDATE rentable_price SET weekday=2700,weekend=2700 WHERE rentable_id=${listing.id} AND slot='day'`;
    }
    const { verifyLifecycleBrowser } = await import('./lib/customer-lifecycle-browser.mjs');
    await check('390px browser lifecycle, inbox/read, private calendar, Book again and staff monitoring', () => verifyLifecycleBrowser({ databaseUrl, actor, stranger, owner, otherOwner, admin, target: browserVisit, newDay }));
  }
  await check('inactive staff and revoked customer sessions cannot operate or read notifications', async () => {
    await sql`UPDATE "user" SET account_status='suspended' WHERE id=${owner.id}`;
    const inactiveVisit = await fixture();
    await fail(() => recordVisitTransition(sql, host, input(inactiveVisit)), 'OPERATOR_REQUIRED');
    await sql`UPDATE admin_user SET is_active=false WHERE id=${admin.id}`;
    await assert.rejects(() => notificationMonitor(sql, admin.id));
    await sql`UPDATE customer_session SET revoked_at=now() WHERE id=${session.id}`;
    await assert.rejects(() => customerNotifications(sql, actor.session, env));
    assert.match(notificationMessage({ template: 'confirmation', reference: 'X', visit_provenance: 'test' }), /Test/);
  });
});
console.log(`Part 15 ${browserOnly ? 'focused browser/access gate' : 'lifecycle gate'}: ${passed} groups passed; disposable database removed. No real provider request or SMS sent.`);
