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
