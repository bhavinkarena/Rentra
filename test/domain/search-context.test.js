import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carrySearchContext, droppedNotice } from '../../lib/domain/discovery.js';
import { addLocalDays, propertyToday } from '../../lib/domain/booking-dates.js';
import { searchTabHref } from '../../lib/domain/vertical-ui.js';
import { safeNext } from '../../lib/domain/safe-next.js';

const d1 = addLocalDays(propertyToday(), 10);
const d2 = addLocalDays(d1, 1);
const carry = (query, to, category) => {
  const { query: out, dropped } = carrySearchContext(query, to, category);
  return { out: Object.fromEntries(new URLSearchParams(out)), dropped };
};

test('Story 3.1: farmhouse search switched to Villa keeps everything, page resets', () => {
  const { out, dropped } = carry(
    `city=surat&area=vesu&dates=${d1}&guests=12&min=5000&slot=day&page=3&category=farmhouse`,
    'farmhouse',
    'villa',
  );
  assert.deepEqual(out, {
    city: 'surat',
    area: 'vesu',
    category: 'villa',
    slot: 'day',
    guests: '12',
    min: '5000',
    dates: d1,
  });
  assert.deepEqual(dropped, []);
});

test('Story 3.1: farmhouse to hotel maps dates and party, drops slot with a notice', () => {
  const { out, dropped } = carry(
    `city=surat&date=${d1}&end=${d2}&mode=consecutive&guests=3&slot=day&min=5000`,
    'hotel',
  );
  assert.deepEqual(out, {
    vertical: 'hotel',
    city: 'surat',
    checkin: d1,
    checkout: d2,
    adults: '3',
    min: '5000',
  });
  assert.deepEqual(dropped, ['slot']);
  assert.equal(
    droppedNotice(dropped, 'hotel'),
    "Time slot doesn't apply to hotels and was removed.",
  );
});

test('Story 3.1: no dates or party are invented', () => {
  const { out } = carry('city=surat', 'hotel');
  assert.deepEqual(out, { vertical: 'hotel', city: 'surat' });
  assert.deepEqual(carry('vertical=hotel&city=surat', 'farmhouse').out, { city: 'surat' });
});

test('Story 3.1: hotel with children to farmhouse counts them as guests, drops rooms', () => {
  const { out, dropped } = carry(
    `vertical=hotel&city=surat&checkin=${d1}&checkout=${d2}&rooms=2&adults=3&children=4,7`,
    'farmhouse',
  );
  assert.deepEqual(out, { city: 'surat', mode: 'consecutive', guests: '5', dates: `${d1},${d2}` });
  assert.deepEqual(dropped, ['rooms']);
});

test('Story 3.1: a hotel stay too long for farm visit dates drops check-out with a notice', () => {
  const { out, dropped } = carry(
    `vertical=hotel&city=surat&checkin=${d1}&checkout=${addLocalDays(d1, 20)}`,
    'farmhouse',
  );
  assert.deepEqual(out, { city: 'surat', dates: d1 });
  assert.deepEqual(dropped, ['checkout']);
  assert.equal(
    droppedNotice(dropped, 'farmhouse'),
    "Check-out doesn't apply to farmhouses and was removed.",
  );
});

test('Story 3.1: "All" removes only the category', () => {
  const { out } = carry(`city=surat&category=villa&guests=4&dates=${d1}`, 'farmhouse', '');
  assert.deepEqual(out, { city: 'surat', guests: '4', dates: d1 });
});

test('Story 3.1: venue tab maps the first date and party to players', () => {
  const href = searchTabHref('entertainment', `city=surat&dates=${d1}&guests=6&bedrooms=2`);
  const out = Object.fromEntries(new URL(href, 'http://x').searchParams);
  assert.deepEqual(out, {
    vertical: 'entertainment',
    city: 'surat',
    date: d1,
    players: '6',
    dropped: 'bedrooms',
  });
});

test('Story 3.1: login next accepts the search URL only as a same-origin path', () => {
  const search = `/search?vertical=hotel&city=surat&checkin=${d1}&children=4%2C7`;
  assert.equal(safeNext(search), search);
  assert.equal(safeNext('/bookings/abc'), '/bookings/abc');
  for (const bad of [
    '//evil.com',
    'https://x',
    '/search?x=//evil.com',
    `/search?q=${'a'.repeat(2000)}`,
    '/admin',
    '/bookings?x=1',
    null,
    '/search?a=1\r\nSet-Cookie:x',
    '/search?a=1%0D%0ASet-Cookie:x',
    '/search?a=\\evil.com',
    '/search\\evil.com',
    '/search?q=a b',
    '/search?q=a\tb',
    '/search?q=a@evil.com',
    '/search?x=%2F%2Fevil.com',
    '/search?x=http://evil.com',
  ])
    assert.equal(safeNext(bad), '/', String(bad));
});

test('Story 3.9: pets carry between farmhouse and hotel, and are dropped for venues', () => {
  assert.equal(carry(`city=surat&dates=${d1}&guests=3&pets=2`, 'hotel').out.pets, '2');
  assert.equal(carry(`vertical=hotel&city=surat&pets=1`, 'farmhouse').out.pets, '1');
  const venue = carry(`city=surat&dates=${d1}&guests=3&pets=2`, 'entertainment');
  assert.equal(venue.out.pets, undefined);
  assert.ok(venue.dropped.includes('pets'));
  assert.equal(carry(`city=surat&guests=3`, 'hotel').out.pets, undefined);
});
