import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaptersFor,
  legacyStep,
  firstIncompleteStepId,
  wizardProgress,
} from '../../lib/domain/listing-steps.js';
import { listingCompletion } from '../../lib/domain/listing-completion.js';
import { tilePoint, tileLocation } from '../../lib/domain/map-pin.js';
const ids = [
  'type',
  'location',
  'space',
  'amenities',
  'photos',
  'story',
  'pricing',
  'availability',
  'rules',
  'ownership',
  'preview',
];
test('both property models have three chapters and eleven steps', () => {
  for (const model of ['slot', 'hour']) {
    const chapters = chaptersFor(model);
    assert.equal(chapters.length, 3);
    assert.deepEqual(
      chapters.flatMap((c) => c.steps.map((s) => s.id)),
      ids,
    );
  }
});
test('old step links map to the new wizard', () => {
  assert.equal(legacyStep('basics'), 'story');
  assert.equal(legacyStep('venue'), 'space');
  assert.equal(legacyStep('capacity'), 'space');
  assert.equal(legacyStep('hours'), 'availability');
  assert.equal(legacyStep('terms'), 'rules');
  assert.equal(legacyStep('review'), 'preview');
});
test('persisted completion comes from the canonical backend result', () => {
  const completion = {
    sections: [
      { id: 'type', done: true },
      { id: 'location', done: false },
    ],
    done: 1,
    total: 10,
  };
  assert.equal(listingCompletion({ completion }), completion);
  assert.equal(firstIncompleteStepId(completion), 'location');
});
test('a new draft starts with no invented completion', () => {
  const c = listingCompletion(null);
  assert.equal(c.done, 0);
  assert.equal(c.canSubmit, false);
  assert.equal(firstIncompleteStepId(c), 'type');
  assert.equal(wizardProgress(c, 'type').stepTotal, 11);
});
test('ownership uploads on file pick, Continue only navigates', () => {
  for (const model of ['slot', 'hour'])
    assert.equal(
      chaptersFor(model)
        .flatMap((c) => c.steps)
        .find((s) => s.id === 'ownership').advance,
      'navigate',
    );
});
test('map pixel coordinates round trip without changing the selected location', () => {
  for (const [lat, lng] of [
    [21.17, 72.83],
    [28.6, 77.2],
  ]) {
    const p = tilePoint(lat, lng, 13),
      l = tileLocation(p.x, p.y, 13);
    assert.ok(Math.abs(l.lat - lat) < 1e-8);
    assert.ok(Math.abs(l.lng - lng) < 1e-8);
  }
});
