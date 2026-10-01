import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  discoveryQuery,
  parseDiscoveryQuery,
  resolveDiscoveryRoute,
} from '../../lib/domain/discovery.js';

const today = '2026-10-01';
const parse = (input) => parseDiscoveryQuery(input, today);
const roundTrip = (input) => {
  const { filters, errors } = parse(input);
  assert.deepEqual(errors, []);
  const again = parse(Object.fromEntries(new URLSearchParams(discoveryQuery(filters))));
  assert.deepEqual(again.errors, []);
  assert.deepEqual(again.filters, filters);
  return { filters, query: discoveryQuery(filters) };
};

test('farmhouse searches round-trip unchanged', () => {
  const { query } = roundTrip({
    city: 'surat',
    area: 'dumas',
    date: '2026-10-10',
    slot: 'day',
    guests: '4',
    min: '1000',
    amenities: 'pool,wifi',
  });
  assert.equal(
    query,
    'city=surat&area=dumas&mode=single&slot=day&guests=4&min=1000&sort=recommended&page=1&dates=2026-10-10&amenities=pool%2Cwifi',
  );
  roundTrip({ dates: '2026-10-10,2026-10-12', slot: 'night' });
  roundTrip({ date: '2026-10-10', end: '2026-10-11', mode: 'consecutive', slot: 'full_day' });
});

test('venue searches round-trip in the documented parameter order', () => {
  const { filters, query } = roundTrip({
    vertical: 'entertainment',
    city: 'surat',
    area: 'vesu',
    category: 'box-cricket',
    date: '2026-10-04',
    start: '18:00',
    duration: '60',
    players: '10',
    indoor: 'false',
    min: '500',
    max: '1500',
    amenities: 'floodlights',
    sort: 'price_asc',
    page: '2',
  });
  assert.equal(
    query,
    'vertical=entertainment&city=surat&area=vesu&category=box-cricket&date=2026-10-04&start=18%3A00&duration=60&players=10&indoor=false&min=500&max=1500&sort=price_asc&page=2&amenities=floodlights',
  );
  assert.deepEqual(filters.dates, ['2026-10-04']);
  assert.equal(filters.indoor, false);
});

test("each vertical drops the other's parameters", () => {
  // A farmhouse link opened on the Entertainment tab: slot, mode, guests and extra dates go.
  const venue = parse({
    vertical: 'entertainment',
    slot: 'night',
    mode: 'consecutive',
    guests: '4',
    dates: '2026-10-04,2026-10-05',
  });
  assert.deepEqual(venue.errors, []);
  assert.deepEqual(venue.filters.dates, ['2026-10-04']);
  const query = new URLSearchParams(discoveryQuery(venue.filters));
  for (const key of ['slot', 'mode', 'guests', 'dates']) assert.equal(query.has(key), false, key);
  // A venue link opened on the Farmhouse tab: time, duration, players and indoor go.
  const farm = parse({ start: '18:00', duration: '90', players: '6', indoor: 'true' });
  assert.equal(farm.filters.start, '');
  const farmQuery = new URLSearchParams(discoveryQuery(farm.filters));
  for (const key of ['vertical', 'start', 'duration', 'players', 'indoor'])
    assert.equal(farmQuery.has(key), false, key);
});

test('venue parameters are validated', () => {
  const bad = parse({ vertical: 'entertainment', start: '25:00', duration: '5', indoor: 'maybe' });
  assert.equal(bad.errors.length, 3);
  assert.equal(parse({ vertical: 'Not A Vertical!' }).errors.length, 1);
  assert.ok(parse({ vertical: 'entertainment', date: '2030-01-01' }).errors.length);
});

const registry = {
  cities: [{ id: 'c1', slug: 'surat', name: 'Surat' }],
  areas: [{ id: 'a1', cityId: 'c1', slug: 'vesu', name: 'Vesu' }],
  categories: [
    { slug: 'farmhouse', name: 'Farmhouse', vertical: 'farmhouse' },
    { slug: 'box-cricket', name: 'Box cricket', vertical: 'entertainment' },
  ],
  verticals: [
    { code: 'farmhouse', slug: 'farmhouse', name: 'Farmhouse' },
    { code: 'entertainment', slug: 'entertainment', name: 'Entertainment' },
  ],
};
const route = (path) => resolveDiscoveryRoute(registry, path.split('/').filter(Boolean));

test('landing routes: activities, the whole vertical, areas and intents of their own vertical', () => {
  assert.equal(route('/surat/box-cricket').title, 'Box cricket in Surat');
  assert.equal(route('/surat/box-cricket').verticalCode, 'entertainment');
  assert.equal(route('/surat/entertainment').title, 'Sports and play venues in Surat');
  assert.equal(route('/surat/entertainment').verticalCode, 'entertainment');
  assert.equal(route('/surat/box-cricket/area/vesu').title, 'Box cricket in Vesu, Surat');
  assert.equal(
    route('/surat/box-cricket/intent/night-games').path,
    '/surat/box-cricket/intent/night-games',
  );
  assert.equal(route('/surat/farmhouse/intent/with-pool').verticalCode, 'farmhouse');
  // Intents never cross verticals.
  assert.equal(route('/surat/box-cricket/intent/with-pool'), null);
  assert.equal(route('/surat/farmhouse/intent/night-games'), null);
  assert.equal(route('/pune/box-cricket'), null);
  assert.equal(route('/surat/bowling'), null);
});
