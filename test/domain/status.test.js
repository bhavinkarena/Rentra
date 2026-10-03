import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, STATUS_TONES, propertyStatus, statusMeta } from '../../lib/domain/status.js';

test('every mapped state has a label and a known tone (DS-02)', () => {
  for (const states of Object.values(STATUS))
    for (const [state, meta] of Object.entries(states)) {
      assert.ok(meta.label, state);
      assert.ok(STATUS_TONES[meta.tone], `${state}: ${meta.tone}`);
    }
});

test('tones follow who has the next move', () => {
  assert.equal(statusMeta('property', 'pending_review').tone, 'info');
  assert.equal(statusMeta('property', 'hidden').tone, 'danger');
  assert.equal(statusMeta('property', 'paused').tone, 'neutral');
  assert.equal(statusMeta('booking', 'confirmed').tone, 'success');
  assert.equal(propertyStatus('draft', 'changes_requested'), 'changes_requested');
});

test('unknown states never show a raw enum', () => {
  assert.equal(statusMeta('booking', 'awaiting_bank_check').label, 'Awaiting bank check');
});
