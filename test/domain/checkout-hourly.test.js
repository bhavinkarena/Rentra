import test from 'node:test';
import assert from 'node:assert/strict';
import { cancellationSteps } from '../../lib/domain/checkout-display.js';
import { describeVisit } from '../../lib/domain/booking-record.js';
import { houseRuleLines } from '../../lib/domain/venue-rules.js';
import { savedListingHref, validSavedSelection } from '../../lib/domain/saved-places.js';

const moderate = {
  bandUnit: 'hours',
  bands: [
    [24, 1],
    [6, 0.5],
    [0, 0],
  ],
  noShow: 0,
};

test('venue cancellation steps count hours before the start', () => {
  const start = '2026-10-10T13:30:00.000Z'; // Sat 7:00 pm IST
  assert.deepEqual(cancellationSteps('moderate', start, '2026-10-01T00:00:00Z', moderate), [
    { rate: 1, until: '2026-10-09T13:30:00.000Z' },
    { rate: 0.5, until: '2026-10-10T07:30:00.000Z' },
    { rate: 0, until: start },
  ]);
  // Without a snapshot the farmhouse day bands still apply.
  assert.equal(
    cancellationSteps('moderate', start, '2026-10-01T00:00:00Z')[0].until,
    '2026-10-03T13:30:00.000Z',
  );
});

test('describeVisit labels both models, after-midnight ends and legacy rows', () => {
  assert.equal(describeVisit({ date: '2026-10-03', slot: 'night' }), 'Sat 3 Oct · Overnight');
  assert.equal(
    describeVisit({
      date: '2026-10-03',
      slot: 'hourly',
      startsAt: '2026-10-03T13:30:00Z',
      endsAt: '2026-10-03T15:30:00Z',
      resource: { name: 'Court 2' },
      activity: { name: 'Box cricket' },
    }),
    'Sat 3 Oct · 7:00 pm – 9:00 pm · Court 2 · Box cricket',
  );
  assert.equal(
    describeVisit({
      date: '2026-10-03',
      slot: 'hourly',
      startsAt: '2026-10-03T17:30:00Z',
      endsAt: '2026-10-03T19:30:00Z',
    }),
    'Sat 3 Oct · 11:00 pm – 1:00 am next day',
  );
  assert.equal(describeVisit({ slot: 'hourly' }), 'Date not recorded');
});

test('venue rules become lines; farmhouse lists pass through', () => {
  assert.deepEqual(houseRuleLines(['No pets']), ['No pets']);
  assert.deepEqual(
    houseRuleLines({
      footwear: 'non_marking',
      minAge: 8,
      foodAllowed: 'no',
      smokingAllowed: false,
      alcoholAllowed: false,
      notes: 'Arrive 10 minutes early.',
    }),
    [
      'Non-marking shoes only',
      'Players 8+ only',
      'No outside food',
      'No smoking',
      'No alcohol',
      'Arrive 10 minutes early.',
    ],
  );
});

test('hourly selections save and link like a venue card', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const selection = {
    kind: 'hourly',
    rentableId: id,
    activity: 'box-cricket',
    date: '2099-01-02',
    start: '19:00',
    durationMinutes: 120,
    resourceId: null,
    guests: 6,
  };
  assert.equal(validSavedSelection(selection, id, '2026-10-01')?.start, '19:00');
  assert.equal(validSavedSelection({ ...selection, date: '2020-01-01' }, id, '2026-10-01'), null);
  assert.equal(
    savedListingHref('/listing/x-y', selection),
    '/listing/x-y?activity=box-cricket&date=2099-01-02&duration=120&players=6&start=19%3A00',
  );
});
