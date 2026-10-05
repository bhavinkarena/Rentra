import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminBookingHref,
  adminCaseHref,
  bookingSheetContext,
} from '../lib/domain/admin-booking-navigation.js';

test('booking sheets preserve all supported filters and separate record tabs', () => {
  const query = {
    tab: 'today',
    q: 'River',
    page: '3',
    property: 'place',
    resource: 'court',
    from: '2026-10-01',
    to: '2026-10-05',
    environment: 'test',
    unit: 'visits',
    booking: 'old',
    recordTab: 'payments',
  };
  const href = adminBookingHref(query, { booking: 'new', recordTab: 'cases' });
  const params = new URL(href, 'https://local.invalid').searchParams;
  assert.equal(params.get('tab'), 'today');
  assert.equal(params.get('resource'), 'court');
  assert.equal(params.get('from'), query.from);
  assert.equal(params.get('booking'), 'new');
  const context = bookingSheetContext(query, 'new');
  assert.equal(context.closeHref.includes('booking='), false);
  assert.equal(context.closeHref.includes('recordTab='), false);
  const full = new URL(context.fullHref, 'https://local.invalid');
  assert.equal(full.pathname, '/admin/bookings/new');
  assert.equal(full.searchParams.get('tab'), 'payments');
  assert.equal(full.searchParams.get('from'), context.closeHref);
});

test('filter changes reset page and incompatible visit unit, never detail state', () => {
  const href = adminBookingHref(
    { tab: 'today', page: 4, unit: 'visits', booking: 'id', recordTab: 'cases', q: 'River' },
    { tab: 'past', page: '1' },
  );
  const params = new URL(href, 'https://local.invalid').searchParams;
  assert.equal(params.get('unit'), null);
  assert.equal(params.get('booking'), null);
  assert.equal(params.get('recordTab'), null);
  assert.equal(params.get('q'), 'River');
  assert.equal(params.get('page'), '1');
});

test('case sheets retain supported filters without confusing state with record tab', () => {
  const href = adminCaseHref(
    { state: 'open', assigned: 'me', type: 'change_request', q: 'ORD', page: 2, case: 'old' },
    { case: 'new' },
  );
  const params = new URL(href, 'https://local.invalid').searchParams;
  assert.equal(params.get('assigned'), 'me');
  assert.equal(params.get('case'), 'new');
  assert.equal(params.get('page'), '2');
  assert.equal(
    adminCaseHref(
      { state: 'resolved', assigned: 'me' },
      { state: 'open', assigned: 'all', page: '1' },
    ),
    '/admin/booking-cases?state=open',
  );
});
