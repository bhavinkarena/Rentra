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
