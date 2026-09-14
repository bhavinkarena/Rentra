import assert from 'node:assert/strict';
import postgres from 'postgres';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { parseDiscoveryQuery, resolveDiscoveryRoute, discoveryQuery } from '../lib/domain/discovery.js';
import { getDiscoveryRegistry, searchDiscovery } from '../lib/db/discovery.js';
import { addLocalDays, propertyToday } from '../lib/domain/booking-dates.js';
import { saveBookingConfiguration, saveBookingPriceOverride } from '../lib/booking/owner-settings.js';
import { previewBookingQuote } from '../lib/booking/quotes.js';
let passed = 0;
const check = async (label, fn) => { await fn(); console.log(`PASS ${label}`); passed++; };
const day = addLocalDays(propertyToday(), 14), second = addLocalDays(day, 2);
await check('bounded strict filters, dates and URL round trips', () => {
  for (const query of [{ guests: '-1' }, { guests: ['2','3'] }, { page: '2.1' }, { dates: '2026-02-30' }, { dates: `${day},${day}` }, { sort: 'rating' }, { min: '20', max: '10' }, { dates: `${day},${second}`, mode: 'single' }, { dates: `${day},${second}`, mode: 'consecutive' }, { amenities: Array(11).fill('pool') }, { date: day, dates: day }, { city: '../login' }]) assert.ok(parseDiscoveryQuery(query).errors.length, JSON.stringify(query));
  const parsed = parseDiscoveryQuery({ date: day, end: addLocalDays(day, 2), mode: 'consecutive', amenities: ['swimming_pool','bonfire'], sort: 'price_desc' });
  assert.equal(parsed.errors.length, 0); assert.equal(parsed.filters.dates.length, 3);
  assert.deepEqual(parseDiscoveryQuery(Object.fromEntries(new URLSearchParams(discoveryQuery(parsed.filters)))).filters, parsed.filters);
});
await withDisposableDatabase('p08', async ({ sql, databaseUrl }) => {
  const [owner] = await sql`INSERT INTO "user" (role,email,account_status) VALUES ('client','search@fixture.invalid','active') RETURNING id`;
  const [city] = await sql`INSERT INTO city (slug,name,state) VALUES ('surat','Surat','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area (city_id,slug,name) VALUES (${city.id},'with-pool','Pool District') RETURNING id`;
  const [category] = await sql`INSERT INTO category (slug,name,form,default_rental_unit) VALUES ('farmhouse','Farmhouses','fixed','slot') RETURNING id`;
  const [amenity] = await sql`INSERT INTO amenity (slug,group_slug,label_en,value_type,is_filterable) VALUES ('swimming_pool','water','Swimming pool','none',true) RETURNING id`;
  const config = { timeZone: 'Asia/Kolkata', leadTimeMinutes: 60, bookingHorizonDays: 90, slots: Object.fromEntries(['day','night','full_day'].map(slot => [slot, { enabled: true, startTime: slot === 'night' ? '18:00' : '09:00', endTime: slot === 'day' ? '18:00' : '09:00', endDayOffset: slot === 'day' ? 0 : 1, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, capacity: 12, includedGuests: 8, extraGuestChargeMinor: 30000 }])) };
  const listings = [];
  for (let index = 0; index < 14; index++) {
    const [listing] = await sql`INSERT INTO rentable (client_id,slug,public_code,title,category_id,city_id,area_id,status,capacity,deposit_amount,cancellation_tier)
      VALUES (${owner.id},${`search-${index}`},${`search${String(index).padStart(4,'0')}`},${`Search place ${index}`},${category.id},${city.id},${area.id},'live',12,2000,'flexible') RETURNING id`;
    listings.push(listing);
    await sql`INSERT INTO rentable_price (rentable_id,slot,weekday,weekend) VALUES (${listing.id},'day',${1000+index*100},${900+index*100}),(${listing.id},'night',2000,1800)`;
    if (index === 0) await saveBookingConfiguration(sql, owner.id, { rentableId: listing.id, expectedVersion: 0, configuration: config });
    else await sql`UPDATE rentable SET booking_config=${JSON.stringify({ ...config, inventoryReady: true })}::jsonb,booking_config_version=1 WHERE id=${listing.id}`;
  }
  await sql`INSERT INTO availability (rentable_id,day,slot,units_available,blocked_by_client) SELECT r.id,d::date,s::availability_slot,1,false FROM rentable r CROSS JOIN generate_series(${day}::date,${second}::date,interval '1 day') d CROSS JOIN unnest(ARRAY['day','night']) s`;
  console.log('Fixture ready: 14 places with explicit booking schedules.');
  await sql`INSERT INTO rentable_amenity (rentable_id,amenity_id) VALUES (${listings[0].id},${amenity.id})`;
  const registry = await getDiscoveryRegistry(sql);
  const searchDatabase = postgres(databaseUrl, { prepare: false, max: 4, onnotice: () => {} });
  try {
  const search = async input => { const parsed = parseDiscoveryQuery(input); assert.deepEqual(parsed.errors, []); return searchDiscovery(parsed.filters, null, searchDatabase, registry); };
  await check('validated registry, legacy intent collision and explicit area paths', () => {
    assert.equal(resolveDiscoveryRoute(registry, ['surat','farmhouse','with-pool']).intent.slug, 'with-pool');
    assert.equal(resolveDiscoveryRoute(registry, ['surat','farmhouse','area','with-pool']).area.id, area.id);
    for (const parts of [['missing','farmhouse'], ['surat','missing'], ['surat','farmhouse','area','missing'], ['surat','farmhouse','bad','with-pool']]) assert.equal(resolveDiscoveryRoute(registry, parts), null);
  });
  if (process.env.CUSTOMER_SEARCH_BROWSER_ONLY !== '1') {
  await check('global price sort, count, page clamping and truthful undated price', async () => {
    const first = await search({ slot: 'day', sort: 'price_asc' });
    assert.equal(first.total, 14); assert.equal(first.items.length, 12); assert.equal(first.items[0].price, 900);
    const last = await search({ slot: 'day', sort: 'price_asc', page: '999' });
    assert.equal(last.page, 2); assert.equal(last.items.length, 2); assert.ok(last.items[0].price >= first.items.at(-1).price);
    assert.equal((await search({ slot: 'day', sort: 'price_desc' })).items[0].price, 2200);
  });
  await check('all dates, authoritative guest/override totals and no persisted quotes', async () => {
    await saveBookingPriceOverride(sql, owner.id, { rentableId: listings[0].id, day, slot: 'day', rentMinor: 999999 });
    const input = { dates: `${day},${second}`, slot: 'day', guests: '10', sort: 'price_desc' };
    const result = await search(input);
    assert.equal(result.total, 14); assert.equal(result.items[0].id, listings[0].id);
    const quote = await previewBookingQuote(sql, { rentableId: listings[0].id, dates: [day,second], slot: 'day', guests: 10 });
    assert.equal(result.items[0].price, quote.totals.totalMinor / 100);
    assert.deepEqual(result.items[0].selection.dates, [day,second]);
    assert.ok(result.items[0].href.includes('dates='));
    await sql`UPDATE availability SET blocked_by_client=true WHERE rentable_id=${listings[0].id} AND day=${second} AND slot='day'`;
    assert.equal((await search(input)).total, 13);
    assert.equal((await search({ date: day, slot: 'day' })).total, 14);
    assert.equal((await sql`SELECT count(*)::int n FROM booking_quote`)[0].n, 0);
    assert.equal((await sql`SELECT count(*)::int n FROM inventory_reservation`)[0].n, 0);
    assert.equal((await sql`SELECT count(*)::int n FROM payment_transaction`)[0].n, 0);
  });
  await check('facets, unsupported filters, empty results and private-data boundary', async () => {
    const result = await search({ amenities: 'swimming_pool', cancellation: 'flexible' });
    assert.equal(result.total, 1);
    assert.equal((await search({ q: '%' })).total, 0);
    assert.equal((await search({ guests: '500' })).total, 0);
    assert.ok((await search({ city: 'missing' })).errors.length);
    assert.ok((await search({ amenities: 'missing' })).errors.length);
    for (const key of ['client_id','location','address','phone','house_rules']) assert.ok(!JSON.stringify(result).includes(`"${key}"`));
    await assert.rejects(() => searchDiscovery(parseDiscoveryQuery({}).filters, null, () => { throw new Error('database unavailable'); }, registry), /database unavailable/);
  });
  }
  if (process.env.CUSTOMER_BROWSER_DRIVER) {
    await sql`UPDATE availability SET blocked_by_client=true WHERE rentable_id=${listings[0].id} AND day=${second} AND slot='day'`;
    const { verifySearchBrowser } = await import('./lib/customer-search-browser.mjs');
    await check('mobile browser filters, Back, pagination, routes, empty and invalid recovery', () => verifySearchBrowser({ databaseUrl, day, second }));
  } else console.log('SKIP browser: set CUSTOMER_BROWSER_DRIVER to playwright-core/index.mjs');
  } finally { await searchDatabase.end({ timeout: 5 }); }
});
console.log(`Customer search: ${passed} groups passed.`);
