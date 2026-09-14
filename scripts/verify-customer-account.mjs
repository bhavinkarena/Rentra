import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { readCustomerAccount,saveCustomerProfile,requestCustomerPrivacy } from '../lib/customer/account.js';
import { readPrivacyQueue,reviewPrivacyRequest } from '../lib/customer/privacy-admin.js';
import { requestCustomerCode,verifyCustomerCode,validCustomerSession } from '../lib/auth/customer-identity.js';
import { verifyAccountBrowser } from './lib/account-browser.mjs';

const env={NODE_ENV:'test',SESSION_SECRET:'part-six-account-fixture-secret-at-least-32-characters'};
let passed=0;
async function check(label,run){
  if(process.env.CUSTOMER_BROWSER_ONLY==='1' && !label.startsWith('360px')) return;
  await run();console.log(`PASS ${label}`);passed++;
}
await withDisposableDatabase('p06',async({sql,connect,databaseUrl})=>{
  const create=async(phone,role='customer')=>{
    const [user]=await sql`INSERT INTO "user"(phone,role,account_status) VALUES(${phone},${role},'active') RETURNING id`;
    const [session]=await sql`INSERT INTO customer_session(user_id,expires_at) VALUES(${user.id},now()+interval '30 days') RETURNING id`;
    return {userId:user.id,sessionId:session.id,role,development:true};
  };
  const actor=await create('9000000601'),other=await create('9000000602'),partner=await create('9000000603','client');
  const profile={name:'Account Fixture',email:'',preferredLocale:'en',marketingConsent:false,expectedVersion:0};
  await check('new account, strict self-scoped profile and separate consent',async()=>{
    assert.equal((await readCustomerAccount(sql,actor,env)).complete,false);
    await assert.rejects(()=>saveCustomerProfile(sql,actor,{...profile,userId:other.userId},env));
    await assert.rejects(()=>saveCustomerProfile(sql,partner,profile,env));
    await assert.rejects(()=>readCustomerAccount(sql,{...actor,sessionId:other.sessionId},env));
    await assert.rejects(()=>readCustomerAccount(sql,actor,{...env,NODE_ENV:'production'}));
    await saveCustomerProfile(sql,actor,profile,env);
    const current=await readCustomerAccount(sql,actor,env);
    assert.equal(current.complete,true);assert.equal(current.marketingConsent,false);assert.equal(current.version,1);
    assert.equal((await readCustomerAccount(sql,other,env)).complete,false);
  });
  await check('profile versions prevent lost updates; email edits clear verification',async()=>{
    await assert.rejects(()=>saveCustomerProfile(sql,actor,profile,env),/another tab/);
    await sql`UPDATE "user" SET email='old@fixture.invalid',email_verified_at=now() WHERE id=${actor.userId}`;
    await saveCustomerProfile(sql,actor,{...profile,email:'new@fixture.invalid',marketingConsent:true,preferredLocale:'gu',expectedVersion:1},env);
    let current=await readCustomerAccount(sql,actor,env);
    assert.equal(current.emailVerified,false);assert.equal(current.marketingConsent,true);assert.equal(current.preferredLocale,'gu');
    await saveCustomerProfile(sql,actor,{...profile,expectedVersion:2},env);
    current=await readCustomerAccount(sql,actor,env);assert.equal(current.marketingConsent,false);assert.equal(current.email,'');
    const remote=connect();
    const outcomes=await Promise.allSettled([saveCustomerProfile(sql,actor,{...profile,expectedVersion:3},env),saveCustomerProfile(remote,actor,{...profile,name:'Other edit',expectedVersion:3},env)]);
    assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  });
  await check('privacy requests persist, deduplicate and isolate customer/admin reads',async()=>{
    const remote=connect();
    const [a,b]=await Promise.all([requestCustomerPrivacy(sql,actor,'deletion',env),requestCustomerPrivacy(remote,actor,'deletion',env)]);
    assert.equal(a.id,b.id);assert.equal((await readCustomerAccount(sql,other,env)).requests.length,0);
    await assert.rejects(()=>requestCustomerPrivacy(sql,partner,'access',env));
    await assert.rejects(()=>readPrivacyQueue(sql,actor.userId));
    const [admin]=await sql`INSERT INTO admin_user(email,name,password_hash) VALUES('account-admin@fixture.invalid','Fixture','not-a-password') RETURNING id`;
    assert.equal((await readPrivacyQueue(sql,admin.id))[0].id,a.id);
    await reviewPrivacyRequest(sql,admin.id,a.id);await reviewPrivacyRequest(sql,admin.id,a.id);
    assert.equal((await readCustomerAccount(sql,actor,env)).requests[0].state,'in_review');
    assert.equal((await sql`SELECT count(*)::int n FROM audit_log WHERE entity_id=${a.id} AND action='privacy_review_started'`)[0].n,1);
    await sql`UPDATE admin_user SET is_active=false WHERE id=${admin.id}`;
    await assert.rejects(()=>readPrivacyQueue(sql,admin.id));
  });
  let updated;
  await check('phone changes need a purpose/account/session-bound code; conflicts do not alter accounts',async()=>{
    const browserToken=randomUUID(),phone='9000000691';
    const conflict=await requestCustomerCode(sql,{phone:'9000000602',browserToken},{env,changeSession:actor});assert.ok(conflict.error);
    const request=await requestCustomerCode(sql,{phone,browserToken},{env,changeSession:actor});assert.ok(request.challengeId);
    assert.equal((await readCustomerAccount(sql,actor,env)).phone,'9000000601');
    const input={phone,browserToken,challengeId:request.challengeId,code:'123456'};
    assert.ok((await verifyCustomerCode(sql,input,{env})).error);
    assert.ok((await verifyCustomerCode(sql,input,{env,changeSession:other})).error);
    assert.ok((await verifyCustomerCode(sql,{...input,code:'000000'},{env,changeSession:actor})).error);
    const remote=connect();
    const results=await Promise.all([verifyCustomerCode(sql,input,{env,changeSession:actor}),verifyCustomerCode(remote,input,{env,changeSession:actor})]);
    assert.equal(results.filter(r=>r.sessionId).length,1);updated=results.find(r=>r.sessionId);
    assert.equal(updated.userId,actor.userId);assert.equal(await validCustomerSession(sql,actor,env),false);
    assert.equal(await validCustomerSession(sql,updated,env),true);
    assert.equal((await readCustomerAccount(sql,updated,env)).phone,phone);
    assert.equal((await sql`SELECT count(*)::int n FROM "user" WHERE role='customer'`)[0].n,2);
  });
  await check('phone claimed after issuance fails safely and login code cannot change a phone',async()=>{
    const phone='9000000692',browserToken=randomUUID();
    const request=await requestCustomerCode(sql,{phone,browserToken},{env,changeSession:updated});
    await create(phone);
    assert.ok((await verifyCustomerCode(sql,{phone,browserToken,challengeId:request.challengeId,code:'123456'},{env,changeSession:updated})).error);
    assert.equal((await readCustomerAccount(sql,updated,env)).phone,'9000000691');
    const login=await requestCustomerCode(sql,{phone:'9000000693',browserToken},{env});
    assert.ok((await verifyCustomerCode(sql,{phone:'9000000693',browserToken,challengeId:login.challengeId,code:'123456'},{env,changeSession:updated})).error);
  });
  await check('revocation prevents profile and privacy mutations',async()=>{
    await sql`UPDATE customer_session SET revoked_at=now() WHERE id=${other.sessionId}`;
    await assert.rejects(()=>saveCustomerProfile(sql,other,profile,env));
    await assert.rejects(()=>requestCustomerPrivacy(sql,other,'access',env));
    await sql`UPDATE "user" SET account_status='suspended' WHERE id=${updated.userId}`;
    await assert.rejects(()=>readCustomerAccount(sql,updated,env));
  });
  if(process.env.CUSTOMER_BROWSER_DRIVER) await check('360px browser onboarding, settings, privacy, phone change and logout',()=>verifyAccountBrowser({sql,databaseUrl,env}));
});
console.log(`Customer account: ${passed} groups passed; disposable database removed.`);
