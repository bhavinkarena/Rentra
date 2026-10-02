import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaptersFor,
  firstIncompleteStepId,
  listingModel,
  LISTING_STEPS,
} from '../../lib/domain/listing-steps.js';
import { listingCompletion } from '../../lib/domain/listing-completion.js';

const ids = (model) => chaptersFor(model).flatMap((c) => c.steps.map((s) => s.id));
const labels = (model) => chaptersFor(model).flatMap((c) => c.steps.map((s) => s.label));
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const config = {
  model: 'hourly',
  timeZone: 'Asia/Kolkata',
  leadTimeMinutes: 30,
  bookingHorizonDays: 60,
  stepMinutes: 60,
  minDurationMinutes: 60,
  maxDurationMinutes: 180,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  weeklyHours: Object.fromEntries(
    days.map((d) => [d, [{ open: '06:00', close: '01:00', closesNextDay: true }]]),
  ),
  inventoryReady: true,
};
const venue = {
  rentalUnit: 'hour',
  categoryId: 'c1',
  categorySlug: 'box-cricket',
  title: 'Smash Arena box cricket',
  description: 'Two floodlit box-cricket cages off Vesu Main Road, nets on all sides.',
  bookingConfig: config,
};
const courts = [{ isActive: true, capacity: 12, activities: ['box-cricket'] }];
const band = (dayKind, startMinute, endMinute) => ({
  activity: 'box-cricket',
  dayKind,
  startMinute,
  endMinute,
  hourlyRate: 800,
});
const section = (completion, id) => completion.sections.find((s) => s.id === id);

test('farmhouse walkthrough is unchanged', () => {
  assert.deepEqual(ids('slot'), [
    'basics',
    'location',
    'capacity',
    'amenities',
    'rules',
    'pricing',
    'terms',
    'photos',
    'ownership',
    'review',
  ]);
  assert.deepEqual(
    LISTING_STEPS.map((s) => s.label),
    labels('slot'),
  );
  assert.ok(labels('slot').includes('House rules'));
  assert.equal(listingModel({ rentalUnit: 'slot' }), 'slot');
  assert.equal(listingModel(null), 'slot');
});

test('venue walkthrough swaps size for courts and adds opening hours, in venue words', () => {
  assert.deepEqual(ids('hour'), [
    'basics',
    'location',
    'venue',
    'amenities',
    'hours',
    'rules',
    'pricing',
    'terms',
    'photos',
    'ownership',
    'review',
  ]);
  assert.equal(chaptersFor('hour')[1].label, 'Courts and facilities');
  assert.ok(!labels('hour').some((l) => /house|farm|guest/i.test(l)));
  assert.equal(listingModel(venue), 'hour');
});

test('every gated step has exactly one completion section, per model', () => {
  for (const [model, listing] of [
    ['slot', {}],
    ['hour', venue],
  ]) {
    const gated = chaptersFor(model)
      .flatMap((c) => c.steps)
      .filter((s) => s.advance !== 'none')
      .map((s) => s.id);
    assert.deepEqual(
      listingCompletion(listing).sections.map((s) => s.id),
      gated,
    );
  }
});

test('venue pricing must cover every open minute, weekday and weekend', () => {
  const full = [band('weekday', 360, 1500), band('weekend', 360, 1500)];
  const priced = (hourlyRates) =>
    section(listingCompletion(venue, { resources: courts, hourlyRates }), 'pricing').done;
  assert.equal(priced(full), true);
  // Split bands that meet exactly still cover the day.
  assert.equal(
    priced([band('weekday', 360, 1080), band('weekday', 1080, 1500), band('weekend', 360, 1500)]),
    true,
  );
  assert.equal(priced([band('weekday', 360, 1500)]), false, 'no weekend price');
  assert.equal(priced([band('weekday', 360, 1440), band('weekend', 360, 1500)]), false, 'gap');
  assert.equal(priced([]), false);
  // Overlapping bands are refused, not averaged.
  assert.equal(
    priced([band('weekday', 360, 1500), band('weekday', 1000, 1200), band('weekend', 360, 1500)]),
    false,
  );
});

test('venue resumes at the first unfinished venue step', () => {
  const placed = {
    ...venue,
    cityId: 'x',
    areaId: 'y',
    location: { x: 1, y: 1 },
    exactAddress: 'a',
  };
  assert.equal(firstIncompleteStepId(listingCompletion(placed), 'hour'), 'venue');
  const withCourts = listingCompletion(placed, { resources: courts });
  assert.equal(firstIncompleteStepId(withCourts, 'hour'), 'amenities');
  // A court that does not offer the main activity leaves the courts step open.
  const wrong = listingCompletion(placed, {
    resources: [{ ...courts[0], activities: ['pickleball'] }],
  });
  assert.equal(section(wrong, 'venue').done, false);
});

test('the ownership step submits its upload form when the owner continues', () => {
  for (const model of ['slot', 'hour'])
    assert.equal(
      chaptersFor(model).flatMap((c) => c.steps).find((s) => s.id === 'ownership').advance,
      'submit',
    );
});
