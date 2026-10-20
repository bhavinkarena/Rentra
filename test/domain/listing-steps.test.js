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

test('hotels (hotel plan, Phase 3): same eleven steps, hotel wording, and their own resume point', async () => {
  const { listingModel, getStep } = await import('../../lib/domain/listing-steps.js');
  const { ownershipDocTypesFor, minPhotosFor, maxPhotosFor } =
    await import('../../lib/domain/listing-completion.js');
  assert.equal(listingModel({ rentalUnit: 'night' }), 'night');
  const chapters = chaptersFor('night');
  assert.deepEqual(
    chapters.flatMap((c) => c.steps.map((s) => s.id)),
    ids,
  );
  assert.deepEqual(
    chapters.map((c) => c.label),
    ['Your hotel', 'Make it shine', 'Rates, rules and submit'],
  );
  assert.deepEqual(
    ['space', 'pricing', 'availability', 'rules', 'ownership'].map(
      (id) => getStep(id, 'night').label,
    ),
    ['Rooms', 'Rates', 'Check-in and check-out', 'House rules', 'Proof and GST'],
  );
  assert.equal(getStep('space', 'slot').label, 'Space', 'farmhouse wording unchanged');
  assert.equal(getStep('space', 'hour').label, 'Courts', 'venue wording unchanged');
  const completion = {
    sections: ids.slice(0, -1).map((id) => ({ id, done: !['pricing', 'rules'].includes(id) })),
    done: 8,
    total: 10,
  };
  assert.equal(firstIncompleteStepId(completion, 'night'), 'pricing');
  assert.equal(wizardProgress(completion, 'space', 'night').chapterLabel, 'Your hotel');
  assert.equal(ownershipDocTypesFor('night')[0].id, 'rent_agreement');
  assert.deepEqual(
    [minPhotosFor('night'), maxPhotosFor('night'), minPhotosFor('slot'), maxPhotosFor('slot')],
    [8, 40, 6, 15],
  );
});
