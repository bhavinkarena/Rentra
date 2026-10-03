import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerErrorCopy } from '../lib/domain/error-copy.js';
test('owner failures explain the recovery without claiming an uncertain save failed', () => {
  assert.match(ownerErrorCopy({ code: 'LISTING_CHANGED' }), /typed changes are kept/);
  assert.match(ownerErrorCopy({ code: 'CALENDAR_CHANGED' }), /preview/);
  assert.match(ownerErrorCopy({ code: 'RESOURCE_HAS_BOOKINGS' }), /Block it/);
  assert.match(ownerErrorCopy({ status: 401 }), /Sign in again/);
  for (const error of [{ code: 'NETWORK_ERROR' }, { status: 503 }]) {
    assert.match(ownerErrorCopy(error), /check whether it was saved/);
    assert.doesNotMatch(ownerErrorCopy(error), /Nothing was changed/);
  }
  assert.equal(
    ownerErrorCopy({ message: 'Keep this validation message.' }),
    'Keep this validation message.',
  );
  assert.doesNotMatch(ownerErrorCopy({ code: 'QUOTE_CHANGED' }), /QUOTE_CHANGED/);
});
