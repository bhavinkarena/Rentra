import test from 'node:test';
import assert from 'node:assert/strict';
import { earningsActivity } from '../lib/domain/earnings-activity.js';

test('daily rent uses IST receipt dates at the month boundary', () => {
  const result = earningsActivity(
    [
      { recordedAt: '2026-09-30T18:29:59Z', bookedRentMinor: '100' },
      { recordedAt: '2026-09-30T18:30:00Z', bookedRentMinor: '200' },
      { recordedAt: '2026-10-31T18:29:59Z', bookedRentMinor: '300' },
      { recordedAt: '2026-10-31T18:30:00Z', bookedRentMinor: '400' },
    ],
    '2026-10',
  );
  assert.equal(result.days[0].bookedRentMinor, '200');
  assert.equal(result.days[30].bookedRentMinor, '300');
  assert.equal(
    result.days.reduce((n, d) => n + d.visits, 0),
    2,
  );
});
test('whole-month chart includes records beyond the 30-row ledger page and preserves paise', () => {
  const rows = Array.from({ length: 35 }, () => ({
    recordedAt: '2026-10-04T05:00:00Z',
    bookedRentMinor: '9007199254740993',
  }));
  const result = earningsActivity(rows, '2026-10');
  assert.equal(result.maxMinor, '315251973915934755');
  assert.equal(result.days[3].visits, 35);
  assert.equal(result.days[3].height, 100);
});
test('empty leap month has all dates and serializable zero amounts', () => {
  const result = earningsActivity([{ recordedAt: 'invalid', bookedRentMinor: '300' }], '2024-02');
  assert.equal(result.days.length, 29);
  assert.equal(result.maxMinor, '0');
  assert.equal(result.days.at(-1).date, '2024-02-29');
  assert.doesNotThrow(() => JSON.stringify(result));
});
