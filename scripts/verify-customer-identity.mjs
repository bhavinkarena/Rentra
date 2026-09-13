import assert from 'node:assert/strict';
import { verifyCustomerBrowser } from './lib/customer-browser.mjs';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { requestCustomerCode, verifyCustomerCode, validCustomerSession, revokeCustomerSession, customerPhone, customerRequestIp, authHash } from '../lib/auth/customer-identity.js';
import { customerDeliveryConfig, deliverCustomerCode } from '../lib/auth/customer-delivery.js';
import { signCustomerSelection, readCustomerSelection, safeCustomerReturnPath } from '../lib/auth/customer-selection.js';
import { createBookingQuote } from '../lib/booking/quotes.js';
import { saveBookingConfiguration, openBookingDates, saveBookingPriceOverride } from '../lib/booking/owner-settings.js';
import { addLocalDays, propertyToday } from '../lib/domain/booking-dates.js';

const env = { NODE_ENV: 'test', SESSION_SECRET: 'customer-identity-fixture-secret-at-least-32-chars' };
const production = { ...env, NODE_ENV:'production' };
let passed = 0;
async function check(label, run) {
  if (process.env.CUSTOMER_BROWSER_ONLY === '1' && !/^(interrupted selection|desktop\/mobile)/.test(label)) return;
  await run(); console.log('PASS ' + label); passed++;
}
await check('strict phones, safe redirects and trusted proxy boundary', async () => {
  assert.equal(customerPhone.parse('+91 98765 43210'),'9876543210');
  for (const bad of ['abc9876543210','1234567890','+19876543210']) assert.equal(customerPhone.safeParse(bad).success,false);
  for (const bad of ['//evil.test','https://evil.test','/\\evil.test','/listing/%2f%2fevil','/listing/a?next=https://evil.test','/partner','/admin','/listing/../admin','/listing/a\n']) assert.equal(safeCustomerReturnPath(bad),'/');
  const headers = new Headers({ 'x-real-ip':'192.0.2.1','x-forwarded-for':'192.0.2.2, 192.0.2.3' });
  assert.equal(customerRequestIp(headers,{}),'unknown');
  assert.equal(customerRequestIp(headers,{ CUSTOMER_AUTH_IP_HEADER:'x-real-ip' }),'192.0.2.1');
  assert.equal(customerRequestIp(headers,{ CUSTOMER_AUTH_IP_HEADER:'x-forwarded-for' }),'unknown');
});
await check('production fails closed; development fixed code never invokes SMS', async () => {
  assert.equal(customerDeliveryConfig(env).mode,'development');
  assert.equal(customerDeliveryConfig(production).mode,'disabled');
  assert.equal(customerDeliveryConfig({}).mode,'disabled');
  for (const NODE_ENV of ['production','staging',undefined]) assert.throws(() => customerDeliveryConfig({ NODE_ENV,CUSTOMER_OTP_DELIVERY:'development' }));
  assert.throws(() => customerDeliveryConfig({ ...production,CUSTOMER_OTP_DELIVERY:'twilio' }));
  await deliverCustomerCode('9000000000','123456',env,() => { throw new Error('Unexpected SMS'); });
});
await check('Twilio request shape, rejection, timeout and no fallback (mock transport only)', async () => {
  const configured = { ...production,CUSTOMER_OTP_DELIVERY:'twilio',TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'fixture',TWILIO_FROM_NUMBER:'+12025550123' };
  await deliverCustomerCode('9000000000','654321',configured,async (url,init) => {
    assert.match(url,/^https:\/\/api.twilio.com\/2010-04-01\/Accounts\/AC[a-f0-9]+\/Messages.json$/);
    assert.equal(init.body.get('To'),'+919000000000'); assert.equal(init.body.get('From'),configured.TWILIO_FROM_NUMBER);
    assert.match(init.body.get('Body'),/654321/); assert.equal(init.redirect,'error'); assert.ok(init.signal);
    return { ok:true,json:async()=>({sid:'SMfixture',status:'queued'}) };
  });
  await assert.rejects(() => deliverCustomerCode('9000000000','654321',configured,async()=>({ok:false})),/delivery failed/);
  await assert.rejects(() => deliverCustomerCode('9000000000','654321',configured,async()=>({ok:true,json:async()=>({sid:'SMfixture',status:'failed'})})),/delivery failed/);
  await assert.rejects(() => deliverCustomerCode('9000000000','654321',configured,async()=>{throw new Error('timeout');}),/timeout/);
});
await check('signed selection preserves all visits, rejects tampering, totals and expiry', async () => {
  const selection = { rentableId:randomUUID(),dates:['2027-01-02','2027-01-01'],slot:'night',guests:9 };
  const token = await signCustomerSelection(selection,'/listing/farm-abc123',env);
  const restored = await readCustomerSelection(token,env);
  assert.deepEqual(restored.selection,{ ...selection, dates:[...selection.dates].sort(),currency:'INR' });
  assert.equal(restored.returnTo,'/listing/farm-abc123');
  assert.equal(await readCustomerSelection(token+'x',env),null);
  const expired = await new SignJWT({selection}).setProtectedHeader({alg:'HS256'}).setAudience('rentra:customer-selection').setIssuedAt(1).setExpirationTime(2).sign(new TextEncoder().encode(env.SESSION_SECRET));
  assert.equal(await readCustomerSelection(expired,env),null);
  await assert.rejects(() => signCustomerSelection({...selection,totalMinor:1},'/',env));
  assert.equal((await readCustomerSelection(await signCustomerSelection(selection,'https://evil.test',env),env)).returnTo,'/');
});

await withDisposableDatabase('p05', async ({ sql, connect, databaseUrl }) => {
  let counter = 0;
  const input = () => ({ phone:`90000${String(++counter).padStart(5,'0')}`,browserToken:randomUUID(),ip:`192.0.2.${counter}` });
  const request = (data, database=sql, options={}) => requestCustomerCode(database,data,{env,...options});
  const verify = (data,challenge,database=sql,code='123456',options={}) => verifyCustomerCode(database,{...data,challengeId:challenge.challengeId,code},{env,...options});
  await check('a requested browser-bound challenge is required; hashes contain no plaintext OTP', async () => {
    const data=input();
    assert.ok((await verify(data,{challengeId:randomUUID()})).error);
    const challenge=await request(data); assert.ok(challenge.challengeId); assert.equal(challenge.development,true);
    const [row]=await sql`SELECT * FROM customer_otp_challenge WHERE id=${challenge.challengeId}`;
    assert.notEqual(row.code_hash,'123456'); assert.equal(row.code_hash.length,64); assert.notEqual(row.browser_hash,data.browserToken);
    assert.ok((await verify({...data,browserToken:randomUUID()},challenge)).error);
    assert.ok((await verify({...data,phone:'9000000999'},challenge)).error);
    const session=await verify(data,challenge); assert.equal(session.role,'customer');
    assert.equal(await validCustomerSession(sql,session,env),true);
    assert.equal(await validCustomerSession(sql,session,production),false);
    assert.ok((await verify(data,challenge)).error);
  });
  await check('configured production delivery uses a random issued code and an active production session', async () => {
    const configured = { ...production,CUSTOMER_OTP_DELIVERY:'twilio',TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'fixture',TWILIO_FROM_NUMBER:'+12025550123' };
    const data=input(); let deliveredCode;
    const challenge=await request(data,sql,{env:configured,deliver:async(phone,code)=>{assert.equal(phone,data.phone);deliveredCode=code;}});
    assert.equal(challenge.development,false); assert.match(deliveredCode,/^[0-9]{6}$/); assert.equal(challenge.code,undefined);
    assert.ok((await verify(data,challenge,sql,'000000',{env:configured})).error);
    const session=await verify(data,challenge,sql,deliveredCode,{env:configured});
    assert.equal(session.development,false); assert.equal(await validCustomerSession(sql,session,configured),true);
  });
  await check('concurrent verify/replay creates exactly one session', async () => {
    const data=input(), challenge=await request(data);
    const results=await Promise.all([verify(data,challenge,connect()),verify(data,challenge,connect())]);
    assert.equal(results.filter(r=>r.sessionId).length,1);
    const [row]=await sql`SELECT count(*)::int n FROM customer_session s JOIN "user" u ON u.id=s.user_id WHERE u.phone=${data.phone}`;
    assert.equal(row.n,1);
  });
  await check('five wrong attempts commit and prevent the correct code', async () => {
    const data=input(), challenge=await request(data);
    for(let i=0;i<5;i++) assert.ok((await verify(data,challenge,sql,'000000')).error);
    assert.ok((await verify(data,challenge)).error);
    assert.equal((await sql`SELECT attempts FROM customer_otp_challenge WHERE id=${challenge.challengeId}`)[0].attempts,5);
  });
  await check('expiry, failed delivery and production cannot accept development challenges', async () => {
    const data=input(), challenge=await request(data);
    await sql`UPDATE customer_otp_challenge SET expires_at=now()-interval '1 second' WHERE id=${challenge.challengeId}`;
    assert.ok((await verify(data,challenge)).error);
    const failed=input(); assert.ok((await request(failed,sql,{deliver:async()=>{throw new Error('provider down');}})).error);
    const [row]=await sql`SELECT id,delivered,consumed_at FROM customer_otp_challenge WHERE phone=${failed.phone}`;
    assert.equal(row.delivered,false); assert.ok(row.consumed_at);
    assert.ok((await verify(failed,{challengeId:row.id})).error);
    const fresh=input(), dev=await request(fresh);
    assert.ok((await verify(fresh,dev,sql,'123456',{env:production})).error);
  });
  await check('concurrent sends, cooldown, hourly cap and superseded code', async () => {
    const data=input(); const results=await Promise.all([request(data,connect()),request(data,connect())]);
    assert.equal(results.filter(r=>r.challengeId).length,1);
    const first=results.find(r=>r.challengeId);
    for(let i=0;i<2;i++) {
      await sql`UPDATE customer_auth_rate SET created_at=now()-interval '2 minutes' WHERE phone_hash=${authHash(`phone:${data.phone}`,env)}`;
      assert.ok((await request(data)).challengeId);
    }
    await sql`UPDATE customer_auth_rate SET created_at=now()-interval '2 minutes' WHERE phone_hash=${authHash(`phone:${data.phone}`,env)}`;
    assert.ok((await request(data)).error); assert.ok((await verify(data,first)).error);
  });
  await check('shared IP request cap and IP/phone verification caps', async () => {
    const data=input();
    await sql`INSERT INTO customer_auth_rate(phone_hash,ip_hash,kind) SELECT ${authHash('other-phone',env)},${authHash(`ip:${data.ip}`,env)},'request' FROM generate_series(1,20)`;
    assert.ok((await request(data)).error);
    for(const scope of ['phone','ip']) {
      const other=input(), challenge=await request(other);
      const count=scope==='phone'?15:60;
      await sql`INSERT INTO customer_auth_rate(phone_hash,ip_hash,kind) SELECT ${authHash(scope==='phone'?`phone:${other.phone}`:'other-phone',env)},${authHash(scope==='ip'?`ip:${other.ip}`:'other-ip',env)},'verify' FROM generate_series(1,${count}::int)`;
      assert.ok((await verify(other,challenge)).error);
    }
  });
  await check('same phone creates separate active customer and keeps partner status', async () => {
    const data=input();
    const [partner]=await sql`INSERT INTO "user"(phone,email,role,account_status) VALUES (${data.phone},'partner@fixture.invalid','client','pending_application') RETURNING id`;
    const session=await verify(data,await request(data)); assert.notEqual(session.userId,partner.id);
    const [row]=await sql`SELECT role,account_status FROM "user" WHERE id=${partner.id}`;
    assert.equal(row.role,'client'); assert.equal(row.account_status,'pending_application');
    assert.equal(await validCustomerSession(sql,{...session,userId:partner.id},env),false);
    assert.equal(await validCustomerSession(sql,{...session,role:'client'},env),false);
    assert.equal(await validCustomerSession(sql,{userId:session.userId,role:'customer'},env),false);
  });
  await check('blocked/suspended login fails; logout, expiry and status changes revoke sessions', async () => {
    for(const status of ['blocked','suspended','pending_application']) {
      const data=input(); await sql`INSERT INTO "user"(phone,role,account_status) VALUES (${data.phone},'customer',${status})`;
      assert.ok((await verify(data,await request(data))).error);
    }
    const data=input(), session=await verify(data,await request(data));
    await revokeCustomerSession(sql,session); await revokeCustomerSession(sql,session);
    assert.equal(await validCustomerSession(sql,session,env),false);
    const second=input(), active=await verify(second,await request(second));
    await sql`UPDATE "user" SET account_status='suspended' WHERE id=${active.userId}`;
    assert.equal(await validCustomerSession(sql,active,env),false);
    await sql`UPDATE "user" SET account_status='active' WHERE id=${active.userId}`;
    assert.equal(await validCustomerSession(sql,active,env),false);
    const third=input(), expired=await verify(third,await request(third));
    await sql`UPDATE customer_session SET expires_at=now()-interval '1 second' WHERE id=${expired.sessionId}`;
    assert.equal(await validCustomerSession(sql,expired,env),false);
  });
  await check('interrupted selection returns all visits/guests and requotes current prices for customer', async () => {
    const [owner]=await sql`INSERT INTO "user"(role,account_status) VALUES ('client','active') RETURNING id`;
    const [city]=await sql`INSERT INTO city(slug,name,state) VALUES ('fixture','Fixture','Gujarat') RETURNING id`;
    const [area]=await sql`INSERT INTO area(city_id,slug,name) VALUES (${city.id},'fixture','Fixture') RETURNING id`;
    const [category]=await sql`INSERT INTO category(slug,name,form,default_rental_unit) VALUES ('fixture','Fixture','fixed','slot') RETURNING id`;
    const [listing]=await sql`INSERT INTO rentable(client_id,slug,public_code,title,category_id,city_id,area_id,status,capacity,deposit_amount) VALUES (${owner.id},'fixture','fix12345','Fixture',${category.id},${city.id},${area.id},'live',12,2000) RETURNING id`;
    await sql`INSERT INTO rentable_price(rentable_id,slot,weekday,weekend) VALUES (${listing.id},'day',6000,6000)`;
    const slot={enabled:false,startTime:'09:00',endTime:'18:00',endDayOffset:0,bufferBeforeMinutes:0,bufferAfterMinutes:0,capacity:12,includedGuests:8,extraGuestChargeMinor:30000};
    await saveBookingConfiguration(sql,owner.id,{rentableId:listing.id,expectedVersion:0,configuration:{timeZone:'Asia/Kolkata',leadTimeMinutes:60,bookingHorizonDays:90,slots:{day:{...slot,enabled:true},night:{enabled:false},full_day:{enabled:false}}}});
    const day=addLocalDays(propertyToday(),14);
    await openBookingDates(sql,owner.id,{rentableId:listing.id,from:day,to:addLocalDays(day,2)});
    const selection={rentableId:listing.id,dates:[day,addLocalDays(day,2)],slot:'day',guests:9};
    const anonymous=await createBookingQuote(sql,selection);
    const token=await signCustomerSelection(selection,'/listing/fixture-fix12345',env);
    const data=input(), session=await verify(data,await request(data));
    await saveBookingPriceOverride(sql,owner.id,{rentableId:listing.id,day,slot:'day',rentMinor:800000});
    const recovered=await readCustomerSelection(token,env);
    const owned=await createBookingQuote(sql,recovered.selection,{customerId:session.userId});
    assert.notEqual(owned.id,anonymous.id); assert.notEqual(owned.totals.totalMinor,anonymous.totals.totalMinor);
    assert.equal(owned.visits.length,2); assert.equal(recovered.selection.guests,9);
    assert.equal((await sql`SELECT customer_id FROM booking_quote WHERE id=${owned.id}`)[0].customer_id,session.userId);
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation`)[0].n,0);
    if(process.env.CUSTOMER_BROWSER_DRIVER) await check('desktop/mobile login recovery and explicit partner switching in Chromium',()=>verifyCustomerBrowser({databaseUrl,sql,day,env}));
  });
});
console.log(`${passed} customer identity scenario groups passed; disposable database removed.`);
