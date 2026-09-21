import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { createSupportRequest, replySupportRequest, readSupportRequest, listSupportRequests } from '../lib/support/service.js';
import { POLICY_VERSION, policyVersions, faqs, supportContact } from '../lib/domain/help.js';
const env = { NODE_ENV: 'test' }; let passed = 0;
async function check(label, run) { if (process.env.CUSTOMER_SUPPORT_BROWSER_ONLY === '1' && !label.startsWith('390px')) return; await run(); console.log('PASS ' + label); passed++; }
const fail = (run, code) => assert.rejects(run, error => error.code === code);
await check('versioned factual policies, practical FAQs and no invented support contact/hours', async () => {
  assert.deepEqual(supportContact({}), { email: null, whatsapp: null, hours: null });
  assert.equal(supportContact({ RENTRA_SUPPORT_EMAIL: 'javascript:bad', NEXT_PUBLIC_WHATSAPP_NUMBER: 'invalid' }).email, null);
  assert.equal(supportContact({ RENTRA_SUPPORT_EMAIL: 'help@example.invalid', RENTRA_SUPPORT_HOURS: 'Mon–Fri, 10–17 Asia/Kolkata' }).hours, 'Mon–Fri, 10–17 Asia/Kolkata');
  assert.deepEqual(Object.keys(policyVersions[POLICY_VERSION]), ['terms','cancellation','privacy']);
  assert.ok(faqs.some(f => /change/i.test(f.question))); assert.ok(faqs.some(f => /data/i.test(f.question)));
});
await withDisposableDatabase('p17', async ({ sql, connect, databaseUrl }) => {
  const [owner, customer, other] = await sql`INSERT INTO "user"(role,name,phone,phone_verified_at,account_status)
    VALUES('client','Support host','9000017001',now(),'active'),('customer','Support guest','9000017002',now(),'active'),('customer','Other guest','9000017003',now(),'active') RETURNING id`;
  const [s1, s2] = await sql`INSERT INTO customer_session(user_id,expires_at) VALUES(${customer.id},now()+interval '1 day'),(${other.id},now()+interval '1 day') RETURNING id`;
  await sql`INSERT INTO customer_profile(user_id,completed_at) VALUES(${customer.id},now()),(${other.id},now())`;
  const actor = { kind: 'customer', session: { role: 'customer', userId: customer.id, sessionId: s1.id, development: true } };
  const stranger = { kind: 'customer', session: { role: 'customer', userId: other.id, sessionId: s2.id, development: true } };
  const [admin] = await sql`INSERT INTO admin_user(email,name,password_hash) VALUES('support@fixture.invalid','Support admin','unused') RETURNING id`;
  const staff = { kind: 'admin', id: admin.id }, host = { kind: 'owner', id: owner.id };
  const [city] = await sql`INSERT INTO city(slug,name,state) VALUES('support','Support','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area(city_id,slug,name) VALUES(${city.id},'support','Support') RETURNING id`;
  const [category] = await sql`INSERT INTO category(slug,name,form,default_rental_unit) VALUES('support','Support','fixed','slot') RETURNING id`;
  const [listing] = await sql`INSERT INTO rentable(client_id,slug,public_code,title,category_id,city_id,area_id,status,exact_address)
    VALUES(${owner.id},'support','sup0017','Current support property',${category.id},${city.id},${area.id},'paused','DO NOT SERIALIZE ADDRESS') RETURNING id`;
  const [order] = await sql`INSERT INTO booking_order(reference,customer_id,rentable_id,state,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,
    amount_rent_minor,amount_fee_minor,amount_deposit_minor,payment_mode,visit_provenance,idempotency_key,request_hash)
    VALUES('SUPPORT-BOOKING',${customer.id},${listing.id},'confirmed','INR','Asia/Kolkata','fixture','customer-v1','{"cancellationTier":"strict"}',
      '{"title":"Accepted support property","contact":{"phone":"DO NOT SERIALIZE PHONE"}}',10000,800,0,'real','test',${randomUUID()},'fixture') RETURNING id`;
  const [privacy] = await sql`INSERT INTO customer_privacy_request(customer_id,kind) VALUES(${customer.id},'access') RETURNING id`;
  const input = extra => ({ category: 'change', subject: 'Changing one visit date', body: 'Please explain how to change one of my visit dates.', orderId: order.id, privacyRequestId: null, requestKey: randomUUID(), ...extra });
  let request;
  await check('request and initial message commit together; forced persistence failure rolls both back', async () => {
    await sql.unsafe(`CREATE FUNCTION pg_temp.reject_support_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.body='Force fixture persistence failure' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END $$`);
    await sql.unsafe('CREATE TRIGGER fixture_support_failure BEFORE INSERT ON support_message FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_support_fixture()');
    await assert.rejects(() => createSupportRequest(sql, actor, input({ body: 'Force fixture persistence failure' }), env));
    assert.equal((await sql`SELECT count(*)::int n FROM support_request`)[0].n, 0);
    assert.equal((await sql`SELECT count(*)::int n FROM support_message`)[0].n, 0);
    await sql.unsafe('DROP TRIGGER fixture_support_failure ON support_message');
    const value = input();
    const [a,b] = await Promise.all([createSupportRequest(sql, actor, value, env), createSupportRequest(connect(), actor, value, env)]);
    assert.equal(a.id,b.id); request = a;
    assert.equal((await readSupportRequest(sql, actor, a.id, env)).messages.length, 1);
    await fail(() => createSupportRequest(sql, actor, { ...value, body: value.body + ' Changed.' }, env), 'IDEMPOTENCY_CONFLICT');
  });
  await check('booking/privacy ownership and staff scope fail closed without revealing references/messages', async () => {
    await fail(() => createSupportRequest(sql, stranger, input(), env), 'NOT_FOUND');
    await fail(() => createSupportRequest(sql, stranger, input({ category: 'privacy', orderId: null, privacyRequestId: privacy.id }), env), 'NOT_FOUND');
    for (const who of [stranger, host, { kind: 'admin', id: randomUUID() }]) await fail(() => readSupportRequest(sql, who, request.id, env), 'NOT_FOUND');
    assert.equal((await listSupportRequests(sql, stranger, {}, env)).total, 0);
    assert.equal((await listSupportRequests(sql, staff, {}, env)).total, 1);
    const result = await readSupportRequest(sql, actor, request.id, env);
    assert.equal(result.context.bookingPolicyVersion, 'customer-v1'); assert.equal(result.context.cancellationTier, 'strict');
    assert.equal(result.context.title, 'Accepted support property'); assert.equal(result.policyVersion, POLICY_VERSION);
    assert.ok(!JSON.stringify(result).includes('DO NOT SERIALIZE'));
    await fail(() => sql`UPDATE support_request SET subject='Changed accepted subject' WHERE id=${request.id}`, '23514');
    await fail(() => sql`UPDATE support_message SET body='Changed initial words' WHERE request_id=${request.id}`, '23514');
    await fail(() => sql`INSERT INTO support_message(request_id,actor_kind,actor_id,body,state_after,request_key,request_hash)
      VALUES(${request.id},'customer',${other.id},'Foreign customer bypass','open',${randomUUID()},${'a'.repeat(64)})`, '23514');
  });
  const reply = (id, version, state = 'in_progress', body = 'We are reviewing your request and will reply here.') => ({ id, version, state, body, requestKey: randomUUID() });
  await check('replies and status changes are replay-safe, audited and reject concurrent stale staff updates', async () => {
    const value = reply(request.id,0);
    const [a,b] = await Promise.all([replySupportRequest(sql, staff, value, env), replySupportRequest(connect(), staff, value, env)]);
    assert.equal(a.id,b.id); assert.equal((await readSupportRequest(sql, actor, request.id, env)).messages.length, 2);
    assert.equal((await sql`SELECT count(*)::int n FROM audit_log WHERE entity='support_request'`)[0].n, 1);
    const outcomes = await Promise.allSettled([replySupportRequest(sql, staff, reply(request.id,1,'waiting_customer'), env), replySupportRequest(connect(), staff, reply(request.id,1,'resolved'), env)]);
    assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(outcomes.find(r => r.status === 'rejected').reason.code, 'STALE_REQUEST');
    await fail(() => replySupportRequest(sql, actor, reply(request.id,2,'in_progress'), env), 'INVALID_STATE');
    await fail(() => replySupportRequest(sql, stranger, reply(request.id,2,'open'), env), 'NOT_FOUND');
    await replySupportRequest(sql, actor, reply(request.id,2,'open','Here are the extra details you requested.'), env);
    await replySupportRequest(sql, staff, reply(request.id,3,'resolved','The change process has been explained; your booking remains unchanged.'), env);
    assert.equal((await readSupportRequest(sql, actor, request.id, env)).state, 'resolved');
    await replySupportRequest(sql, actor, reply(request.id,4,'open','Please reopen this question for another clarification.'), env);
    assert.equal((await readSupportRequest(sql, actor, request.id, env)).state, 'open');
    assert.equal((await sql`SELECT state FROM booking_order WHERE id=${order.id}`)[0].state, 'confirmed');
    assert.equal((await sql`SELECT count(*)::int n FROM refund`)[0].n, 0);
  });
  await check('linked privacy status stays independent of support resolution; filters and literal text persist', async () => {
    const p = await createSupportRequest(sql, actor, input({ category: 'privacy', subject: 'Question about account data', orderId: null, privacyRequestId: privacy.id, body: 'Please explain which account records are retained. <script>unsafe()</script>' }), env);
    await replySupportRequest(sql, staff, reply(p.id,0,'resolved','We explained retention; your data-copy request is still open.'), env);
    assert.equal((await readSupportRequest(sql, actor, p.id, env)).privacy.state, 'open');
    await sql`UPDATE customer_privacy_request SET state='in_review' WHERE id=${privacy.id}`;
    assert.equal((await readSupportRequest(sql, actor, p.id, env)).privacy.state, 'in_review');
    assert.equal((await listSupportRequests(sql, actor, { state: 'resolved' }, env)).total, 1);
    assert.equal((await listSupportRequests(sql, actor, { page: 2 }, env)).items.length, 0);
  });
  if (process.env.CUSTOMER_BROWSER_DRIVER) {
    const { verifySupportBrowser } = await import('./lib/customer-support-browser.mjs');
    await check('390px browser help/policies, persisted support conversation, admin resolution and private access', () => verifySupportBrowser({ databaseUrl, actor, stranger, owner, admin, order, privacy }));
  }
  await check('bounded request abuse and revoked/inactive identities reject without writes', async () => {
    const current = (await listSupportRequests(sql, actor, {}, env)).total;
    for (let i = current; i < 5; i++) await createSupportRequest(sql, actor, input({ category: 'other', orderId: null }), env);
    await fail(() => createSupportRequest(sql, actor, input(), env), 'RATE_LIMIT');
    await sql`UPDATE admin_user SET is_active=false WHERE id=${admin.id}`;
    await fail(() => listSupportRequests(sql, staff, {}, env), 'NOT_FOUND');
    await fail(() => replySupportRequest(sql, staff, reply(request.id,5), env), 'NOT_FOUND');
    await sql`UPDATE customer_session SET revoked_at=now() WHERE id=${s1.id}`;
    await assert.rejects(() => readSupportRequest(sql, actor, request.id, env));
    await assert.rejects(() => createSupportRequest(sql, actor, input(), env));
  });
});
console.log(`Part 17: ${passed} groups passed; disposable database removed. No external messages sent.`);
