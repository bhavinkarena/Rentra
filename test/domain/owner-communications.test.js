import test from 'node:test';
import assert from 'node:assert/strict';
import { updateHref, updateTitle } from '../../lib/domain/client-updates.js';
import { ownerHelpHref } from '../../lib/domain/owner-help.js';
import {
  ownerSupportCategories,
  ownerSupportStates,
  supportContact,
} from '../../lib/domain/help.js';
const id = '11111111-1111-4111-8111-111111111111';
test('owner inbox destinations prioritize private source records', () => {
  assert.equal(
    updateHref({ action: 'dispute_response_requested', orderId: id, detail: { disputeId: id } }),
    `/partner/disputes/${id}`,
  );
  assert.equal(
    updateHref({ action: 'support_reply', orderId: id, detail: { supportId: id } }),
    `/partner/support/${id}`,
  );
  assert.equal(
    updateHref({ action: 'dates_running_out', rentableId: id, detail: {} }),
    `/partner/listings/${id}/calendar`,
  );
  assert.equal(updateHref({ action: 'caretaker_revoked', detail: {} }), '/partner/team');
  assert.equal(
    updateHref({ action: 'review_published', detail: { reviewId: id } }),
    '/partner/reviews',
  );
  assert.equal(
    updateHref({ action: 'dispute_opened', detail: { disputeId: 'https://external.invalid' } }),
    '/partner',
  );
  assert.equal(updateTitle({ action: 'application_rejected' }), 'Owner application not approved');
});
test('owner page help links use task article anchors', () => {
  for (const [path, anchor] of [
    ['/partner/listings/x/calendar', 'calendar-pricing'],
    ['/partner/team', 'caretakers'],
    ['/partner/earnings', 'getting-paid'],
    ['/partner/bookings/x', 'booking-help'],
    ['/partner/reviews', 'reviews'],
    ['/partner/settings/security', 'verification-details'],
    ['/partner/listings/new', 'adding-property'],
  ])
    assert.equal(ownerHelpHref(path), `/partner/help#${anchor}`);
});
test('owner support uses owner topics, reply labels and validated configured contacts', () => {
  assert.equal(Object.keys(ownerSupportCategories).length, 7);
  assert.equal(ownerSupportStates.waiting_customer, 'Waiting for your reply');
  assert.deepEqual(
    supportContact({
      RENTRA_SUPPORT_PHONE: 'javascript:bad',
      RENTRA_SUPPORT_EMAIL: '<bad>',
      NEXT_PUBLIC_WHATSAPP_NUMBER: 'bad',
    }),
    { email: null, whatsapp: null, phone: null, hours: null },
  );
  assert.equal(supportContact({ RENTRA_SUPPORT_PHONE: '+919876543210' }).phone, '+919876543210');
});
