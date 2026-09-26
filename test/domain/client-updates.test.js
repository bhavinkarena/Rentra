import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateHref, updateTitle, visibleTasks } from '../../lib/domain/client-updates.js';

test('titles follow the recorded outcome', () => {
  assert.equal(
    updateTitle({ action: 'listing_review_decided', detail: { outcome: 'changes_requested' } }),
    'Rentra asked for changes',
  );
  assert.equal(
    updateTitle({ action: 'verification_scheduled', detail: { mode: 'physical' } }),
    'Site visit scheduled',
  );
  assert.equal(
    updateTitle({ action: 'verification_recorded', detail: { outcome: 'failed' } }),
    'Verification did not pass',
  );
  assert.equal(updateTitle({ action: 'something_new', detail: {} }), 'something new');
});

test('links go to the booking, then the property, then the overview', () => {
  assert.equal(updateHref({ orderId: 'o1', rentableId: 'r1' }), '/partner/bookings/o1');
  assert.equal(updateHref({ rentableId: 'r1' }), '/partner/listings/r1/overview');
  assert.equal(updateHref({ category: 'account' }), '/partner');
});

test('only tasks with work appear, required work first', () => {
  const tasks = visibleTasks([
    { key: 'updates_unread', kind: 'info', count: 2 },
    { key: 'properties_attention', kind: 'action', count: 0 },
    { key: 'properties_unbookable', kind: 'action', count: 1 },
    { key: 'unknown', kind: 'action', count: 4 },
  ]);
  assert.deepEqual(
    tasks.map((t) => [t.key, t.label]),
    [
      ['properties_unbookable', '1 live property is not bookable yet'],
      ['updates_unread', '2 unread updates'],
    ],
  );
});
