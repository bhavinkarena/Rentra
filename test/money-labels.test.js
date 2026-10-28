import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  guestPaymentLabel,
  moneyEnvironmentLabel,
  payoutStateLabel,
  refundLabel,
} from '../lib/domain/owner-earnings.js';

test('Story 2.16 money labels keep payment, refund and payout states distinct', () => {
  assert.equal(moneyEnvironmentLabel('live'), null);
  assert.equal(moneyEnvironmentLabel('simulated'), 'Simulation');
  assert.equal(moneyEnvironmentLabel('test'), 'Test');
  assert.equal(moneyEnvironmentLabel('legacy_unknown'), 'Legacy');
  assert.equal(guestPaymentLabel('unpaid'), 'Not paid');
  assert.equal(refundLabel('needs_review'), 'Refund needs review');
  for (const s of ['not_started', 'scheduled', 'processing', 'needs_check', 'failed', 'on_hold'])
    assert.notEqual(payoutStateLabel(s), 'Paid');
  assert.equal(payoutStateLabel('paid'), 'Paid');
  assert.equal(payoutStateLabel(undefined), 'Not recorded');
});
