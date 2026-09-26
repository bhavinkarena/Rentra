import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffRevisions } from '../../lib/domain/revision-diff.js';

const base = {
  listing: {
    title: 'River Farm',
    capacity: 12,
    location: { x: 72.8, y: 21.1 },
    houseRules: { notes: null },
  },
  place: { city: 'Surat', area: 'Dumas', category: 'Farmhouse' },
  prices: [{ slot: 'day', weekday: 1000, weekend: 1500 }],
  amenities: [{ labelEn: 'pool', value: null }],
  documents: [{ docType: 'extract_7_12', status: 'uploaded' }],
  photos: [{ key: 'a' }, { key: 'b' }],
};

test('identical revisions have no differences', () => {
  assert.deepEqual(diffRevisions(base, structuredClone(base)), []);
  assert.deepEqual(diffRevisions(null, base), []);
});

test('changed trust fields, prices, amenities and photos are listed', () => {
  const next = structuredClone(base);
  next.listing.capacity = 14;
  next.listing.location = { x: 72.9, y: 21.1 };
  next.prices[0].weekend = 1800;
  next.amenities.push({ labelEn: 'parking', value: '8' });
  next.photos = [{ key: 'a' }, { key: 'c' }, { key: 'd' }];
  const rows = Object.fromEntries(diffRevisions(base, next).map((r) => [r.label, r]));
  assert.deepEqual(rows.Capacity, { label: 'Capacity', before: '12', after: '14' });
  assert.equal(rows['Map location'].after, '21.1, 72.9');
  assert.equal(rows.Prices.after, 'day ₹1000/₹1800');
  assert.equal(rows.Amenities.after, 'parking: 8, pool');
  assert.equal(rows.Photos.after, '3 photo(s): 2 new, 1 removed');
  assert.equal(Object.keys(rows).length, 5);
});
