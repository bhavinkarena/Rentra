import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clock12,
  listingFacts,
  pageVertical,
  searchTabHref,
  unitLabel,
  verticalTabs,
} from '../../lib/domain/vertical-ui.js';

const registry = {
  cities: [{ slug: 'surat', name: 'Surat' }],
  categories: [
    { slug: 'farmhouse', vertical: 'farmhouse' },
    { slug: 'box-cricket', vertical: 'entertainment' },
  ],
  verticals: [
    { code: 'entertainment', slug: 'entertainment', name: 'Entertainment', sortOrder: 20 },
    { code: 'farmhouse', slug: 'farmhouse', name: 'Farmhouse', sortOrder: 10 },
  ],
};

test('tabs: one per public vertical in registry order, none until two are public', () => {
  const tabs = verticalTabs(registry, 'entertainment');
  assert.deepEqual(
    tabs.map((t) => [t.code, t.href, t.active]),
    [
      ['farmhouse', '/', false],
      ['entertainment', '/entertainment', true],
    ],
  );
  assert.deepEqual(
    verticalTabs({ ...registry, verticals: registry.verticals.slice(1) }, 'farmhouse'),
    [],
  );
  assert.deepEqual(verticalTabs({ cities: [], categories: [] }, 'farmhouse'), []);
});

test('the active vertical comes from the page; pages without tabs give null', () => {
  assert.equal(pageVertical('/', registry), 'farmhouse');
  assert.equal(pageVertical('/entertainment', registry), 'entertainment');
  assert.equal(pageVertical('/search', registry), 'farmhouse');
  assert.equal(pageVertical('/search', registry, 'entertainment'), 'entertainment');
  assert.equal(pageVertical('/surat/box-cricket', registry), 'entertainment');
  assert.equal(pageVertical('/surat/box-cricket/area/vesu', registry), 'entertainment');
  assert.equal(pageVertical('/surat/farmhouse/intent/with-pool', registry), 'farmhouse');
  assert.equal(pageVertical('/surat/entertainment', registry), 'entertainment');
  for (const path of [
    '/listing/smash-arena-abc12345',
    '/saved',
    '/help',
    '/pune/box-cricket',
    '/surat',
  ])
    assert.equal(pageVertical(path, registry), null, path);
});

test('switching tabs on /search keeps where and the first date, nothing else', () => {
  assert.equal(
    searchTabHref('entertainment', { city: 'surat', area: 'vesu', date: '2026-10-04' }),
    '/search?vertical=entertainment&city=surat&area=vesu&date=2026-10-04',
  );
  assert.equal(
    searchTabHref('farmhouse', { city: 'surat', area: null, date: '' }),
    '/search?city=surat',
  );
  assert.equal(searchTabHref('farmhouse', {}), '/search');
});

test('card facts: farmhouse line unchanged, venues by activity, courts, players and indoor', () => {
  assert.deepEqual(listingFacts({ capacity: 12, bedrooms: 3, highlight: 'Private pool' }), [
    'Up to 12 guests',
    '3 BR',
    'Private pool',
  ]);
  assert.deepEqual(listingFacts({ vertical: 'farmhouse', capacity: 8 }), ['Up to 8 guests']);
  const venue = {
    vertical: 'entertainment',
    activities: [
      { name: 'Box cricket', iconKey: 'cricket' },
      { name: 'Pickleball', iconKey: 'pickleball' },
    ],
    resourceCount: 3,
    maxPlayers: 12,
    isIndoor: false,
  };
  assert.deepEqual(listingFacts(venue), [
    'Box cricket · Pickleball',
    '3 courts',
    'Up to 12 players',
    'Outdoor',
  ]);
  assert.deepEqual(
    listingFacts({
      ...venue,
      activities: [{ name: 'Bowling', iconKey: 'bowling' }],
      resourceCount: 1,
      isIndoor: null,
    }),
    ['Bowling', '1 lane', 'Up to 12 players'],
  );
});

test('time and unit labels', () => {
  assert.equal(clock12('00:00'), '12:00 AM');
  assert.equal(clock12('12:30'), '12:30 PM');
  assert.equal(clock12('17:00'), '5:00 PM');
  assert.equal(unitLabel('hour'), 'hr');
  assert.equal(unitLabel('night'), 'night');
});
