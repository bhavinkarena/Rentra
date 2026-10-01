import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchAvailability,
  availabilityMonthRange,
  fetchTimes,
  fetchHourlyAvailability,
} from '../../lib/api/availability.js';

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

test('hourly availability uses public uncached endpoints and preserves selections', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), options });
    return Response.json({
      success: true,
      data: String(url).includes('/times?')
        ? { times: [], durations: [60, 120] }
        : { days: { '2030-01-07': { open: true, freeStarts: 2 } } },
    });
  });
  const choice = {
    code: 'venue001',
    date: '2030-01-07',
    activity: 'box-cricket',
    duration: 120,
    guests: 4,
  };
  assert.deepEqual(await fetchTimes(choice), { times: [], durations: [60, 120] });
  await fetchHourlyAvailability({ ...choice, from: choice.date, days: 14 });
  assert.match(calls[0].url.pathname, /venue001\/times$/);
  assert.match(calls[1].url.pathname, /venue001\/availability$/);
  for (const { url, options } of calls) {
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    assert.equal(url.searchParams.get('activity'), 'box-cricket');
    assert.equal(url.searchParams.get('duration'), '120');
    assert.equal(url.searchParams.get('guests'), '4');
  }
});

test('time-grid failures preserve API error codes and reject malformed success', async (t) => {
  const choice = {
    code: 'venue001',
    date: '2030-01-07',
    activity: 'box-cricket',
    duration: 60,
    guests: 1,
  };
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
  );
  await assert.rejects(fetchTimes(choice), { code: 'RATE_LIMITED' });
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ success: true, data: { times: [] } }),
  );
  await assert.rejects(fetchTimes(choice), /Invalid availability response/);
});
