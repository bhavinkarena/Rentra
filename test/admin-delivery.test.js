import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryMeta, deliveryOperation } from '../lib/domain/admin-delivery.js';
test('provider acceptance and uncertain dispatch never claim delivery or allow a blind retry', () => {
  assert.equal(deliveryMeta('accepted').label, 'Provider accepted');
  assert.equal(deliveryMeta('accepted').tone, 'info');
  assert.equal(deliveryMeta('delivered').tone, 'success');
  assert.equal(deliveryMeta('undelivered').tone, 'danger');
  assert.equal(deliveryMeta('future_state').tone, 'neutral');
  for (const state of ['accepted', 'pending', 'sending', 'delivered', 'undelivered', 'suppressed'])
    assert.equal(deliveryOperation({ state }), null);
  assert.equal(deliveryOperation({ state: 'unknown' }), 'reconcile');
  for (const state of ['blocked', 'failed', 'retry']) {
    assert.equal(deliveryOperation({ state }), 'retry');
    assert.equal(deliveryOperation({ state, provider_id: 'original-sid' }), null);
  }
});
