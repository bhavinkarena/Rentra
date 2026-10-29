import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facilitySummary, photoLabel } from '../../lib/domain/hotel-ui.js';

test('facilitySummary shows 4 and counts the rest', () => {
  const list = Array.from({ length: 14 }, (_, i) => `item_${i}`);
  const { shown, more } = facilitySummary(list);
  assert.deepEqual(shown, ['Item 0', 'Item 1', 'Item 2', 'Item 3']);
  assert.equal(more, 10);
  assert.deepEqual(facilitySummary(['wifi']), { shown: ['Wifi'], more: 0 });
  assert.deepEqual(facilitySummary(), { shown: [], more: 0 });
});

test('photoLabel is one-based', () => {
  assert.equal(photoLabel(1, 5), 'Photo 2 of 5');
});

test('Story 3.3: sleeping places and meal inclusions', async () => {
  const { roomSleeps, extraPlacesLine, resolveInclusions, mealsLine } =
    await import('../../lib/domain/hotel-ui.js');
  assert.deepEqual(roomSleeps([{ type: 'double', count: 1 }], [{ type: 'extra_bed', count: 1 }]), {
    inBeds: 2,
    extra: 1,
    total: 3,
  });
  assert.equal(
    roomSleeps([
      { type: 'single', count: 2 },
      { type: 'sofa_bed', count: 1 },
    ]).total,
    3,
  );
  assert.equal(
    extraPlacesLine([
      { type: 'extra_bed', count: 1 },
      { type: 'mattress', count: 2 },
    ]),
    '+1 Extra bed · +2 Mattresses',
  );
  assert.equal(mealsLine(resolveInclusions('CP', null)), 'Breakfast included');
  assert.equal(mealsLine(resolveInclusions('EP', null)), 'Room only');
  assert.equal(
    mealsLine({ breakfast: true, lunch: false, dinner: true }),
    'Breakfast and dinner included',
  );
  assert.equal(mealsLine(resolveInclusions('AP')), 'Breakfast, lunch and dinner included');
});

test('Story 3.4: bedding line from the priced rooms', async () => {
  const { beddingLine } = await import('../../lib/domain/hotel-ui.js');
  const bed = [{ type: 'extra_bed', count: 1, mode: 'fixed', amount: 500 }];
  assert.equal(beddingLine([]), '');
  assert.equal(beddingLine([{ nights: [{ beddingMinor: 0 }] }]), '');
  assert.equal(
    beddingLine([{ bedding: bed, nights: [{ beddingMinor: 50000 }, { beddingMinor: 50000 }] }]),
    'Includes 1 extra bed · ₹500/night',
  );
  assert.equal(
    beddingLine([{ bedding: bed, nights: [{ beddingMinor: 40000 }, { beddingMinor: 60000 }] }]),
    'Includes 1 extra bed · ₹400–₹600/night',
  );
  assert.equal(
    beddingLine([{ bedding: [{ type: 'mattress', count: 1 }], nights: [{ beddingMinor: 0 }] }]),
    'Includes 1 mattress',
  );
  assert.equal(
    beddingLine([{ bedding: [{ type: 'extra_bed', count: 1 }] }]),
    'Includes 1 extra bed',
  );
});

test('rates drawer is dirty only when the form really changed', async () => {
  const { formDirty } = await import('../../lib/domain/hotel-ui.js');
  const initial = { from: '2026-11-01', weekdays: [0, 1, 2], roomTypeIds: ['a', 'b'], value: '' };
  assert.equal(formDirty(initial, { ...initial }), false);
  assert.equal(formDirty(initial, { ...initial, weekdays: [2, 1, 0] }), false);
  assert.equal(formDirty(initial, { ...initial, value: '10' }), true);
  assert.equal(formDirty(initial, { ...initial, roomTypeIds: ['a'] }), true);
});

test('Story 3.6: child policy errors and plain-words disclosure', async () => {
  const { policyProblem, policyLine, cotsLine, defaultChildPolicy } =
    await import('../../lib/domain/hotel-ui.js');
  const bands = [
    { kind: 'infant', fromAge: 0, toAge: 1, rule: { type: 'free', amount: 0 } },
    { kind: 'child', fromAge: 2, toAge: 11, rule: { type: 'fixed', amount: 500 } },
  ];
  const policy = { adultRateFromAge: 12, bands };
  assert.equal(policyProblem(policy), null);
  assert.equal(
    policyProblem({ ...policy, bands: [bands[0], { ...bands[1], fromAge: 3 }] }),
    'Age 2 is not covered',
  );
  assert.match(
    policyProblem({
      ...policy,
      bands: [
        { ...bands[1], fromAge: 0, toAge: 5 },
        { ...bands[1], fromAge: 4 },
      ],
    }),
    /two bands/,
  );
  assert.equal(policyProblem({ ...policy, adultRateFromAge: 14 }), 'Ages 12-13 are not covered');
  assert.equal(
    policyLine(policy).replace(/\s/g, ' '),
    "Under 2: free · 2-11: ₹500/night · 12+: adult rate (for guests beyond the room's base occupancy; when only some children pay, the oldest pay first)",
  );
  assert.equal(
    policyLine({ adultRateFromAge: 18, bands: [{ ...bands[0], toAge: 17 }] }),
    'Under 18: free',
  );
  // Same checks as the API: blanks, ranges, free price, order.
  assert.equal(
    policyProblem({ ...policy, bands: [{ ...bands[0], toAge: '' }, bands[1]] }),
    'Enter every age as a whole year from 0 to 17',
  );
  assert.match(
    policyProblem({
      ...policy,
      bands: [bands[0], { ...bands[1], rule: { type: 'fixed', amount: '' } }],
    }),
    /whole rupees/,
  );
  assert.equal(
    policyProblem({
      ...policy,
      bands: [{ ...bands[0], rule: { type: 'free', amount: 5 } }, bands[1]],
    }),
    'A free band has no price',
  );
  assert.equal(
    policyProblem({ ...policy, bands: [bands[1], bands[0]] }),
    'List the bands from youngest to oldest',
  );
  assert.equal(
    policyProblem({
      ...policy,
      bands: [
        { ...bands[1], toAge: 1, fromAge: 0 },
        { ...bands[0], fromAge: 2, toAge: 11 },
      ],
    }),
    'Infant bands come before child bands',
  );
  assert.equal(
    policyProblem({ ...policy, adultRateFromAge: '' }),
    'Adult rate starts between age 2 and 18',
  );
  assert.equal(cotsLine({ count: 1, amount: 0 }), '1 cot · free');
  assert.equal(cotsLine({ count: 0 }), '');
  assert.equal(policyProblem(defaultChildPolicy(6, 400)), null);
  assert.equal(policyProblem(defaultChildPolicy(0, 0)), null);
});

test('Story 3.7: percent child bands validate and read as a share, never a ₹ amount', async () => {
  const { policyProblem, policyLine } = await import('../../lib/domain/hotel-ui.js');
  const policy = (kind, amount) => ({
    adultRateFromAge: 12,
    bands: [
      { kind: 'infant', fromAge: 0, toAge: 1, rule: { type: 'free', amount: 0 } },
      { kind, fromAge: 2, toAge: 11, rule: { type: 'percent', amount } },
    ],
  });
  assert.equal(policyProblem(policy('child', 25)), null);
  for (const amount of [0, 101, ''])
    assert.match(policyProblem(policy('child', amount)), /percent/);
  assert.equal(
    policyProblem({
      adultRateFromAge: 2,
      bands: [{ kind: 'infant', fromAge: 0, toAge: 1, rule: { type: 'percent', amount: 25 } }],
    }),
    'Infant bands are free or a fixed price',
  );
  const line = policyLine(policy('child', 25));
  assert.match(line, /2-11: 25% of the room price ÷ adults, per child\/night/);
  assert.doesNotMatch(line.split(' (')[0], /₹/);
});
