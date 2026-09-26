import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cancellationSteps,
  checkoutStage,
  clockTime,
  localDay,
  mayLaunchCheckout,
  shortDay,
} from '../../lib/domain/checkout-display.js';

const arrival = '2026-10-12T03:30:00.000Z'; // Mon 12 Oct, 9:00 am IST
const booked = '2026-09-26T06:00:00.000Z';

test('refund ladder follows the tier and merges equal neighbouring bands', () => {
  assert.deepEqual(cancellationSteps('moderate', arrival, booked), [
    { rate: 1, until: '2026-10-05T03:30:00.000Z' },
    { rate: 0.5, until: '2026-10-09T03:30:00.000Z' },
    { rate: 0, until: arrival },
  ]);
  // Flexible pays 100% at both 7 and 3 days out: one step, ending 3 days before.
  assert.deepEqual(cancellationSteps('flexible', arrival, booked), [
    { rate: 1, until: '2026-10-09T03:30:00.000Z' },
    { rate: 0.5, until: arrival },
  ]);
});

test('refund steps that already ended are not offered', () => {
  const late = cancellationSteps('moderate', arrival, '2026-10-08T00:00:00.000Z');
  assert.equal(late[0].rate, 0.5, 'the full-refund window has passed');
  assert.deepEqual(cancellationSteps('strict', arrival, '2026-10-13T00:00:00.000Z'), []);
  assert.deepEqual(cancellationSteps(null, arrival, booked), [], 'unknown tier shows no ladder');
});

test('times and dates render identically on any ICU build', () => {
  assert.equal(clockTime(arrival), '9:00 am');
  assert.equal(clockTime('2026-10-12T06:30:00.000Z'), '12:00 pm');
  assert.equal(clockTime('2026-10-12T18:30:00.000Z'), '12:00 am');
  assert.equal(shortDay('2026-10-12T18:30:00.000Z'), 'Tue, 13 Oct', 'midnight IST is the next day');
  assert.equal(shortDay('2026-09-27T03:30:00.000Z'), 'Sun, 27 Sep');
  assert.equal(localDay('2026-10-02'), 'Fri, 2 Oct');
});

test('checkout stage picks one screen for every persisted state', () => {
  const held = { state: 'held', executionState: 'ready', paymentState: 'created' };
  assert.equal(checkoutStage(null, 300), 'review');
  assert.equal(checkoutStage(held, 300), 'held');
  assert.equal(checkoutStage(held, 0), 'timeUp');
  assert.equal(checkoutStage({ ...held, paymentState: 'failed' }, 60), 'failed');
  assert.equal(checkoutStage({ ...held, executionState: 'unknown' }, 0), 'pending');
  assert.equal(checkoutStage({ ...held, needsResolution: true }, 60), 'resolution');
  assert.equal(checkoutStage({ state: 'confirmed', paymentState: 'succeeded' }, 0), 'confirmed');
  assert.equal(checkoutStage({ state: 'cancelled' }, 0), 'cancelled');
  assert.equal(checkoutStage({ state: 'partially_cancelled' }, 0), 'booked');
  assert.equal(checkoutStage({ state: 'expired' }, 0), 'expired');
});

test('payment opens only for a live, unpaid, linked-or-ready hold', () => {
  const held = { state: 'held', executionState: 'ready', paymentState: 'created' };
  assert.equal(mayLaunchCheckout(held, 30), true);
  assert.equal(mayLaunchCheckout(held, 0), false);
  assert.equal(mayLaunchCheckout({ ...held, executionState: 'dispatched' }, 30), false);
  assert.equal(mayLaunchCheckout({ ...held, paymentState: 'succeeded' }, 30), false);
});
