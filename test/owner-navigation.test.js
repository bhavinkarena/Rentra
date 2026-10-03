import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerNavMatch, ownerRouteLabel } from '../lib/domain/owner-navigation.js';
test('old money and help deep links select exactly one destination', () => {
  const destinations = [
    '/partner',
    '/partner/calendar',
    '/partner/bookings',
    '/partner/listings',
    '/partner/earnings',
    '/partner/reviews',
    '/partner/team',
    '/partner/help',
    '/partner/settings',
  ];
  for (const [path, expected] of [
    ['/partner/settings/payout', '/partner/earnings'],
    ['/partner/earnings/payouts', '/partner/earnings'],
    ['/partner/earnings/payout', '/partner/earnings'],
    ['/partner/earnings/statements', '/partner/earnings'],
    ['/partner/payouts/123', '/partner/earnings'],
    ['/partner/allocations/123', '/partner/earnings'],
    ['/partner/support/new', '/partner/help'],
    ['/partner/disputes/123', '/partner/help'],
    ['/partner/onboarding/kyc', '/partner'],
    ['/partner/listings/123/calendar', '/partner/listings'],
  ]) {
    assert.deepEqual(
      destinations.filter((href) => ownerNavMatch(path, href)),
      [expected],
    );
  }
  assert.equal(ownerRouteLabel('/partner/disputes/123'), 'Disputes');
  assert.equal(ownerRouteLabel('/partner/settings/payout'), 'Earnings');
  assert.equal(ownerRouteLabel('/partner/earnings/payouts'), 'Earnings');
  assert.equal(ownerRouteLabel('/partner/earnings/payout'), 'Earnings');
  assert.equal(ownerRouteLabel('/partner', false), 'Get verified');
  assert.equal(ownerNavMatch('/partner/listings-unrelated', '/partner/listings'), false);
});
