import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAvailability, availabilityMonthRange } from '../../lib/api/availability.js';

const input = { code: 'u4pshrym', from: '2026-09-23', days: 8, guests: 1 };

test('live dates are returned without caching or sending session credentials', async (t) => {
  const days = { '2026-09-24': { day: true, night: false, full: false } };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).searchParams.get('days'), '8');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    return Response.json({ success: true, data: { days } });
  });
  assert.deepEqual((await fetchAvailability(input)).days, days);
});

test('a stalled request times out, allowing the calendar to offer retry', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    (_url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  );
  await assert.rejects(fetchAvailability({ ...input, timeoutMs: 10 }), /timed out/);
});

test('changing month cancels the previous request', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    (_url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  );
  const controller = new AbortController();
  const request = fetchAvailability({ ...input, signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
});

test('invalid responses do not silently become an all-disabled calendar', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, data: {} }));
  await assert.rejects(fetchAvailability(input), /Invalid availability/);
});

test('requests stay within the displayed month, including leap years', () => {
  assert.deepEqual(availabilityMonthRange('2026-09-01', '2026-09-23'), {
    from: '2026-09-23',
    days: 8,
  });
  assert.deepEqual(availabilityMonthRange('2026-10-01', '2026-09-23'), {
    from: '2026-10-01',
    days: 31,
  });
  assert.deepEqual(availabilityMonthRange('2028-02-01', '2028-01-31'), {
    from: '2028-02-01',
    days: 29,
  });
});
