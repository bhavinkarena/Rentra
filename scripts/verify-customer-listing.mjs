import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import {
  absolutePublicUrl, amenityStates, normalizePublicPhotos, publicSlotSchedules,
} from '../lib/domain/listing-content.js';
import { copyListingUrl, shareListing, whatsappListingUrl } from '../lib/domain/listing-share.js';

let passed = 0;
async function check(label, run) { await run(); console.log(`PASS ${label}`); passed += 1; }

await check('absolute image normalization rejects private shapes and strips URL parameters', () => {
  const photos = normalizePublicPhotos([
    { url: '/seed/a.jpg?token=private', alt: 'Local' },
    { url: 'https://res.cloudinary.com/demo/image/upload/a.jpg?signature=secret#x', alt: 'Remote' },
    { key: 'rentra/listings/id/photo_1', alt: 'Upload' },
    { url: 'javascript:alert(1)' },
    { url: '//evil.example/photo.jpg' },
    { url: 'https://user:secret@res.cloudinary.com/private.jpg' },
    { url: 'https://unconfigured.example/photo.jpg' },
  ], { cloudName: 'public-cloud' });
  assert.deepEqual(photos.map((photo) => photo.url), [
    '/seed/a.jpg', 'https://res.cloudinary.com/demo/image/upload/a.jpg',
    'https://res.cloudinary.com/public-cloud/image/upload/rentra/listings/id/photo_1',
  ]);
  assert.equal(absolutePublicUrl('https://rentra.test', photos[0].url), 'https://rentra.test/seed/a.jpg');
  assert.equal(absolutePublicUrl('https://rentra.test', photos[1].url), photos[1].url);
});

await check('amenity and schedule states remain explicit', () => {
  const states = amenityStates({
    selected: [
      { id: 'pool', label: 'Swimming pool', valueType: 'dimensions', value: '15x25 ft' },
      { id: 'cook', label: 'Cook available', valueType: 'charge', value: '₹800' },
    ],
    catalogue: [{ id: 'pool', label: 'Swimming pool' }, { id: 'wifi', label: 'Wifi' }],
  });
  assert.deepEqual(states.included, ['Swimming pool — 15x25 ft']);
  assert.deepEqual(states.extra, ['Cook available — ₹800']);
  assert.deepEqual(states.unavailable, ['Wifi']);
  assert.deepEqual(states.unknown, []);
  assert.deepEqual(amenityStates({ catalogue: [{ id: 'wifi', label: 'Wifi' }] }).unknown, ['Wifi']);
  assert.deepEqual(publicSlotSchedules({ slots: {
    day: { enabled: true, startTime: '09:00', endTime: '18:00', endDayOffset: 0, capacity: 12, includedGuests: 8 },
    night: { enabled: false },
  } }).map((slot) => slot.slot), ['day']);
});

await check('canonical share cancellation and clipboard failure remain predictable', async () => {
  const payload = { title: 'Fixture', text: 'Fixture Farm', url: 'https://rentra.test/listing/fixture-part9001' };
  assert.equal(await shareListing({ share: async () => { const error = new Error('cancel'); error.name = 'AbortError'; throw error; } }, payload), 'cancelled');
  assert.equal(await shareListing({ share: async () => { throw new Error('unavailable'); }, clipboard: { writeText: async () => {} } }, payload), 'copied');
  assert.equal(await copyListingUrl({ writeText: async () => { throw new Error('denied'); } }, payload.url), 'failed');
  const whatsapp = whatsappListingUrl(payload);
  assert.ok(whatsapp.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(whatsapp).includes(payload.url));
  assert.equal(whatsapp.includes('dates='), false);
});

await withDisposableDatabase('p09', async ({ sql, databaseUrl }) => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.CLOUDINARY_CLOUD_NAME = 'fixture-cloud';
  const { getListingByCode } = await import('../lib/db/queries.js');
  const { sql: appSql } = await import('../lib/db/index.js');
  const [owner] = await sql`INSERT INTO "user" (role,name,phone,account_status) VALUES ('client','Fixture Owner','9999999999','active') RETURNING id`;
  const [city] = await sql`INSERT INTO city (slug,name,state) VALUES ('surat','Surat','Gujarat') RETURNING id`;
  const [area] = await sql`INSERT INTO area (city_id,slug,name) VALUES (${city.id},'kamrej','Kamrej') RETURNING id`;
  const [category] = await sql`INSERT INTO category (slug,name,form,default_rental_unit) VALUES ('farmhouse','Farmhouses','fixed','slot') RETURNING id`;
  const config = { timeZone: 'Asia/Kolkata', leadTimeMinutes: 60, bookingHorizonDays: 90, slots: {
    day: { enabled: true, startTime: '09:00', endTime: '18:00', endDayOffset: 0, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, capacity: 12, includedGuests: 8, extraGuestChargeMinor: 0 },
    night: { enabled: false }, full_day: { enabled: false },
  } };
  const [listing] = await sql`INSERT INTO rentable (client_id,slug,public_code,title,description,category_id,city_id,area_id,status,capacity,deposit_amount,booking_config,photos,location,exact_address,verified_at)
    VALUES (${owner.id},'fixture-farm','part9001','Fixture Farm','Published description',${category.id},${city.id},${area.id},'live',12,2000,${JSON.stringify(config)}::jsonb,${JSON.stringify([{ url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg?secret=1', alt: 'Pool' }, { key: 'rentra/listings/fixture/photo_2', alt: 'Lawn' }])}::jsonb,ST_SetSRID(ST_MakePoint(72.9,21.2),4326),'Private road',now()) RETURNING id`;
  await sql`INSERT INTO rentable_price (rentable_id,slot,weekday,weekend) VALUES (${listing.id},'day',6000,7000)`;
  const [pool] = await sql`INSERT INTO amenity (slug,group_slug,label_en,value_type,is_filterable,sort_order) VALUES ('pool','water','Swimming pool','dimensions',true,1) RETURNING id`;
  await sql`INSERT INTO amenity (slug,group_slug,label_en,value_type,is_filterable,sort_order) VALUES ('wifi','practical','Wifi','none',true,2)`;
  await sql`INSERT INTO rentable_amenity (rentable_id,amenity_id,value) VALUES (${listing.id},${pool.id},'15x25 ft')`;
  await sql`INSERT INTO verification_visit (rentable_id,mode,outcome,completed_at,geo_lat,geo_lng) VALUES (${listing.id},'physical','passed',now(),21.2,72.9)`;
  const [customer] = await sql`INSERT INTO "user" (role,name,account_status) VALUES ('customer','Reviewer','active') RETURNING id`;
  const [booking] = await sql`INSERT INTO booking (reference,customer_id,rentable_id,day,slot,starts_at,ends_at,amount_rent,amount_fee,state)
    VALUES ('PART9REVIEW',${customer.id},${listing.id},current_date-2,'day',now()-interval '2 days',now()-interval '1 day',6000,480,'completed') RETURNING id`;
  await assert.rejects(() => sql`INSERT INTO review (booking_id,rentable_id,author_id,author_role,rating,body) VALUES (${booking.id},${listing.id},${customer.id},'customer',5,'Still private')`, e => e.code === '23514');
  const detail = await getListingByCode('part9001');
  await check('public detail uses evidence, published content and the privacy boundary', () => {
    assert.equal(detail.physicallyVerified, true);
    assert.deepEqual(detail.slotSchedules.map((slot) => slot.slot), ['day']);
    assert.deepEqual(detail.amenities.included, ['Swimming pool — 15x25 ft']);
    assert.deepEqual(detail.amenities.unavailable, ['Wifi']);
    assert.equal(detail.reviews.length, 0);
    assert.equal(detail.photos[0].url, 'https://res.cloudinary.com/demo/image/upload/photo.jpg');
    assert.equal(detail.photos[1].url, 'https://res.cloudinary.com/fixture-cloud/image/upload/rentra/listings/fixture/photo_2');
    const serialized = JSON.stringify(detail);
    for (const secret of ['Private road', '9999999999', 'geoLat', 'geoLng', '21.2', '72.9']) assert.equal(serialized.includes(secret), false, secret);
  });
  await sql`UPDATE rentable SET status='paused' WHERE id=${listing.id}`;
  await check('paused listings are not public', async () => assert.equal(await getListingByCode('part9001'), null));
  await appSql.end({ timeout: 5 });
});

await check('gallery traps keyboard focus and restores its opener', async () => {
  const source = await readFile(new URL('../components/rentra/listing/PhotoGallery.jsx', import.meta.url), 'utf8');
  for (const behavior of ["e.key === 'Escape'", "e.key === 'ArrowRight'", "e.key === 'ArrowLeft'", "e.key === 'Tab'", 'openerRef.current?.focus']) assert.ok(source.includes(behavior), behavior);
});

console.log(`Customer listing: ${passed} groups passed; disposable database removed.`);
