import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeListings, normalizeBookings } from '../../lib/partner/query-args.js';
import {
  safePortalRedirect,
  disposePortalStore,
  tagsForPartnerPaths,
  tagsForRevision,
} from '../../lib/partner/cache.js';
import { makePortalStore } from '../../lib/store/portal.js';
import { partnerService } from '../../lib/services/partner.service.js';

test('URL arguments normalize arrays, pages, search, queues and property IDs', () => {
  assert.deepEqual(normalizeListings({ page: '-1', q: ['a'], status: 'invalid' }), {
    query: '',
    status: 'all',
    page: 1,
    pageSize: 10,
  });
  assert.equal(normalizeListings({ q: ' hi ', page: '03' }).query, 'hi');
  assert.equal(normalizeListings({ page: '03' }).page, 3);
  assert.equal(normalizeBookings({ page: ['2'], property: '../foo', tab: 'today' }).page, 1);
  assert.equal(normalizeBookings({ property: '../foo' }).property, '');
  assert.equal(normalizeBookings({ q: 'a'.repeat(200) }).q.length, 100);
});
test('only supported internal destinations may be replayed', () => {
  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/partner/../evil',
    '/partner\\evil',
    '/admin',
    '/partner?x=\nfoo',
  ])
    assert.equal(safePortalRedirect(value), null);
  assert.equal(safePortalRedirect('/partner/login?session=ended'), '/partner/login?session=ended');
});
test('disposing a store aborts pending work; late responses never populate a replacement', async (t) => {
  let finish;
  t.mock.method(
    globalThis,
    'fetch',
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  // Node has no window: use a non-proxied detail route for the lifecycle test.
  const old = makePortalStore('old');
  const replacement = makePortalStore('new');
  const request = old.dispatch(partnerService.endpoints.getPartnerRecord.initiate('one'));
  while (!finish) await new Promise((resolve) => setImmediate(resolve));
  disposePortalStore(old);
  finish(Response.json({ success: true, data: { private: 'old account' } }));
  await request;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(old.getState().rentraApi.queries, {});
  assert.deepEqual(replacement.getState().rentraApi.queries, {});
  disposePortalStore(replacement);
});

test('Server Action paths invalidate dependent queues, counts and calendars', () => {
  assert.deepEqual(tagsForPartnerPaths(['/partner/bookings/order']), [
    'PartnerRecords',
    'PartnerSummary',
    'PartnerCalendar',
  ]);
  assert.deepEqual(tagsForPartnerPaths(['/partner/listings/a/calendar']), [
    'PartnerListings',
    'PartnerSummary',
    'PartnerCalendar',
  ]);
  assert.deepEqual(tagsForPartnerPaths(['/partner/updates']), ['PartnerUpdates']);
  assert.deepEqual(tagsForPartnerPaths(['/help']), []);
  assert.deepEqual(tagsForRevision('marker:PartnerUpdates'), ['PartnerUpdates']);
});
