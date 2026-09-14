import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { readCustomerSaved,changeCustomerSaved,mergeCustomerSaved,savedPlaceCards } from '../lib/customer/saved.js';
import { parseGuestSaved,validSavedSelection,selectionFromSavedUrl,savedListingHref,guestSavedSchema } from '../lib/domain/saved-places.js';
import { addLocalDays,propertyToday } from '../lib/domain/booking-dates.js';
import { verifySavedBrowser } from './lib/saved-browser.mjs';
const env={NODE_ENV:'test',SESSION_SECRET:'saved-place-fixture-secret-at-least-thirty-two-characters'};
let passed=0;
async function check(label,run) { await run(); console.log('PASS '+label); passed++; }
await check('guest corruption, size, duplicate IDs, injected data and stale date context',async()=>{
 const id=randomUUID(),entry={rentableId:id,entryId:randomUUID(),selection:null};
 assert.deepEqual(parseGuestSaved('{broken'),[]); assert.deepEqual(parseGuestSaved('{}'),[]);
 assert.deepEqual(parseGuestSaved(JSON.stringify([entry,entry])),[]);
 assert.equal(guestSavedSchema.safeParse(Array.from({length:101},()=>({...entry,rentableId:randomUUID(),entryId:randomUUID()}))).success,false);
 assert.equal(guestSavedSchema.safeParse([{...entry,customerId:randomUUID()}]).success,false);
 const selection={rentableId:id,dates:[addLocalDays(propertyToday(),2)],slot:'night',guests:6};
 assert.equal(validSavedSelection({...selection,total:1},id),null);
 assert.equal(validSavedSelection({...selection,dates:['2000-01-01']},id),null);
 const href=savedListingHref('/listing/fixture-fix12345',validSavedSelection(selection,id));
 assert.deepEqual(selectionFromSavedUrl(href.split('?')[1],id),{...selection,currency:'INR'});
 assert.equal(selectionFromSavedUrl('dates=bad&guests=1&slot=day',id),null);
});
await withDisposableDatabase('p07',async({sql,connect,databaseUrl})=>{
 const customer=async(phone)=>{
  const [u]=await sql`INSERT INTO "user"(role,phone,name,account_status) VALUES ('customer',${phone},'Fixture Customer','active') RETURNING id`;
  await sql`INSERT INTO customer_profile(user_id) VALUES (${u.id})`;
  const [s]=await sql`INSERT INTO customer_session(user_id,expires_at) VALUES (${u.id},now()+interval '30 days') RETURNING id`;
  return {userId:u.id,sessionId:s.id,role:'customer',accountStatus:'active'};
 };
 const a=await customer('9876543210'),b=await customer('9876543211');
 const [owner]=await sql`INSERT INTO "user"(role,account_status) VALUES ('client','active') RETURNING id`;
 const [city]=await sql`INSERT INTO city(slug,name,state) VALUES ('fixture','Fixture City','Gujarat') RETURNING id`;
 const [area]=await sql`INSERT INTO area(city_id,slug,name) VALUES (${city.id},'fixture','Fixture Area') RETURNING id`;
 const [category]=await sql`INSERT INTO category(slug,name,form,default_rental_unit) VALUES ('fixture','Fixture category','fixed','slot') RETURNING id`;
 const listing=async(slug,code,status='live')=>{
  const [l]=await sql`INSERT INTO rentable(client_id,slug,public_code,title,category_id,city_id,area_id,status,capacity,deposit_amount)
    VALUES (${owner.id},${slug},${code},${slug==='fixture'?'Saved Fixture':'Second Fixture'},${category.id},${city.id},${area.id},${status},12,2000) RETURNING id`;
  await sql`INSERT INTO rentable_price(rentable_id,slot,weekday,weekend) VALUES (${l.id},'day',6000,6000)`;
  return l.id;
 };
 const first=await listing('fixture','fix12345'),second=await listing('second','fix23456');
 const selection={rentableId:first,dates:[addLocalDays(propertyToday(),14),addLocalDays(propertyToday(),16)],slot:'day',guests:6};
 const entry={rentableId:first,entryId:randomUUID(),selection};
 await check('concurrent guest merge and unique customer/listing pair',async()=>{
  await Promise.all([mergeCustomerSaved(connect(),a,[entry],env),mergeCustomerSaved(connect(),a,[entry],env)]);
  assert.equal((await readCustomerSaved(sql,a,env)).length,1);
  assert.equal((await sql`SELECT count(*)::int n FROM customer_favourite WHERE customer_id=${a.userId}`)[0].n,1);
  assert.equal((await sql`SELECT count(*)::int n FROM customer_favourite_merge WHERE customer_id=${a.userId}`)[0].n,1);
 });
 await check('merge replay after removal cannot resurrect a saved place; undo is explicit and idempotent',async()=>{
  await changeCustomerSaved(sql,a,{rentableId:first,saved:false},env);
  await mergeCustomerSaved(sql,a,[entry],env); assert.equal((await readCustomerSaved(sql,a,env)).length,0);
  await changeCustomerSaved(sql,a,{rentableId:first,saved:true,selection},env);
  await changeCustomerSaved(sql,a,{rentableId:first,saved:true},env);
  assert.deepEqual((await readCustomerSaved(sql,a,env))[0].selection,{...selection,currency:'INR'});
 });
 await check('account isolation, second-session persistence and stale/foreign session denial',async()=>{
  assert.deepEqual(await readCustomerSaved(sql,b,env),[]);
  await changeCustomerSaved(sql,b,{rentableId:first,saved:false},env);
  assert.equal((await readCustomerSaved(sql,a,env)).length,1);
  const [s]=await sql`INSERT INTO customer_session(user_id,expires_at) VALUES (${a.userId},now()+interval '1 day') RETURNING id`;
  assert.equal((await readCustomerSaved(connect(),{...a,sessionId:s.id},env)).length,1);
  for(const session of [{...a,userId:b.userId},{...a,role:'client'},{...a,sessionId:randomUUID()}]) await assert.rejects(()=>readCustomerSaved(sql,session,env));
  await sql`UPDATE customer_session SET revoked_at=now() WHERE id=${s.id}`;
  await assert.rejects(()=>changeCustomerSaved(sql,{...a,sessionId:s.id},{rentableId:second,saved:true},env));
 });
 await check('private/unpublished/deleted listings return removable redacted cards',async()=>{
  await sql`UPDATE rentable SET status='paused' WHERE id=${first}`;
  const cards=await readCustomerSaved(sql,a,env);
  assert.deepEqual(Object.keys(cards[0]).sort(),['rentableId','selection','available','title'].sort());
  assert.equal(cards[0].title,'Unavailable place'); assert.equal(cards[0].available,false);
  await changeCustomerSaved(sql,a,{rentableId:first,saved:false},env);
  await changeCustomerSaved(sql,a,{rentableId:first,saved:true},env); // undo still works while unavailable
  await assert.rejects(()=>changeCustomerSaved(sql,b,{rentableId:first,saved:true},env));
  const missing=randomUUID(); await mergeCustomerSaved(sql,b,[{rentableId:missing,entryId:randomUUID(),selection:null}],env);
  assert.equal((await readCustomerSaved(sql,b,env))[0].available,false);
  await changeCustomerSaved(sql,b,{rentableId:missing,saved:false},env);
  await sql`UPDATE rentable SET status='live' WHERE id=${first}`;
  const fresh=await savedPlaceCards(sql,[entry]);
  assert.ok(fresh[0].href.includes('guests=6')); assert.equal(fresh[0].area,'Fixture Area, Fixture City');
  assert.equal(JSON.stringify(fresh).includes('client_id'),false);
 });
 await check('invalid writes roll back and blocked customers cannot read or mutate',async()=>{
  await assert.rejects(()=>changeCustomerSaved(sql,a,{rentableId:second,saved:true,customerId:b.userId},env));
  await assert.rejects(()=>mergeCustomerSaved(sql,a,[{...entry,selection:{...selection,totalMinor:1}}],env));
  assert.equal((await readCustomerSaved(sql,a,env)).length,1);
  const c=await customer('9876543212');
  await sql`UPDATE "user" SET account_status='blocked' WHERE id=${c.userId}`;
  await assert.rejects(()=>readCustomerSaved(sql,c,env));
  await assert.rejects(()=>mergeCustomerSaved(sql,c,[entry],env));
 });
 await check('full list merge is atomic and failed receipt can be retried',async()=>{
  await sql`INSERT INTO customer_favourite(customer_id,rentable_id) SELECT ${b.userId},gen_random_uuid() FROM generate_series(1,100)`;
  const attempt={rentableId:second,entryId:randomUUID(),selection:null};
  await assert.rejects(()=>mergeCustomerSaved(sql,b,[attempt],env));
  assert.equal((await sql`SELECT count(*)::int n FROM customer_favourite_merge WHERE customer_id=${b.userId} AND entry_id=${attempt.entryId}`)[0].n,0);
  await sql`DELETE FROM customer_favourite WHERE customer_id=${b.userId}`;
  await mergeCustomerSaved(sql,b,[attempt],env);
  assert.equal((await readCustomerSaved(sql,b,env)).length,1);
 });
 if(process.env.CUSTOMER_BROWSER_DRIVER) {
  await sql`DELETE FROM customer_favourite WHERE customer_id IN (${a.userId},${b.userId})`;
  await check('guest/account browser persistence, merge, failure rollback, undo and logout isolation',()=>verifySavedBrowser({sql,databaseUrl,env,a,b,first,second,selection}));
 }
});
console.log(`${passed} saved-place scenario groups passed; disposable database removed.`);
