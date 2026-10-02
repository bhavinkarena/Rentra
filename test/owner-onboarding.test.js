import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificationOutcome } from '../lib/domain/owner-onboarding.js';
test('verification outcomes provide the reason and one relevant next action', () => {
  assert.equal(verificationOutcome({ status: 'draft' }), null);
  assert.match(verificationOutcome({ submitted: true }).body, /Check back here/);
  const corrected = verificationOutcome({
    changesRequested: true,
    remaining: [{ href: '/partner/onboarding/kyc' }],
    decisionReason: 'Upload a clear ID',
  });
  assert.equal(corrected.href, '/partner/onboarding/kyc');
  assert.equal(corrected.body, 'Upload a clear ID');
  assert.match(
    verificationOutcome({ status: 'rejected', decisionReason: 'Wrong document', strikesLeft: 1 })
      .body,
    /Wrong document.*1 more time/,
  );
  assert.equal(verificationOutcome({ status: 'blocked' }).action, 'Contact support');
});
