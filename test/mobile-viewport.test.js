import test from 'node:test';
import assert from 'node:assert/strict';
import { keyboardOccludesViewport } from '../lib/domain/mobile-viewport.js';
test('mobile keyboard hides actions, browser chrome and pinch zoom retain them', () => {
  assert.equal(keyboardOccludesViewport(800, 420), true);
  assert.equal(keyboardOccludesViewport(800, 720), false);
  assert.equal(keyboardOccludesViewport(800, 420, 2), false);
  assert.equal(keyboardOccludesViewport(420, 420), false);
});
