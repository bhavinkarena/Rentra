/**
 * Customer Part 1 domain verification. No database, server, .env or network.
 * Run: node scripts/verify-customer-foundation.mjs
 * Child processes exercise the same code in overseas process timezones.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { BOOKING_POLICY } from '../lib/domain/booking-policy.js';
import {
  addLocalDays, buildVisitIntervals, consecutiveVisitDates, formatLocalDate,
  intervalsOverlap, isLocalDate, isWeekendLocalDate, normalizeVisitDates,
  parseLocalDate, propertyToday, visitInterval,
} from '../lib/domain/booking-dates.js';
import {
  applyBasisPoints, calculateVisitPriceMinor, formatINRMinor,
  legacyRupeesToMinor, priceVisitsMinor,
} from '../lib/domain/booking-money.js';
import { availabilityDateRange, legacyAvailabilityDays } from '../lib/domain/booking-availability.js';
import { availabilityQuerySchema, bookingSelectionSchema } from '../lib/validation/zod/booking.js';
import { calculateBookingPrice } from '../lib/domain/pricing.js';

let passed = 0;
const failures = [];
function check(name, run) {
  try {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}

const daySchedule = {
  enabled: true, startTime: '09:00', endTime: '18:00', endDayOffset: 0,
  bufferBeforeMinutes: 30, bufferAfterMinutes: 60,
};
const nightSchedule = {
  enabled: true, startTime: '18:00', endTime: '10:00', endDayOffset: 1,
  bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
};
const fullDaySchedule = {
  enabled: true, startTime: '09:00', endTime: '09:00', endDayOffset: 1,
  bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
};
const bookingWindow = {
  dates: ['2026-10-03'], slot: 'day', schedule: daySchedule,
  now: '2026-10-01T00:00:00.000Z', leadTimeMinutes: 60, bookingHorizonDays: 30,
};
const rate = {
  weekdayMinor: 600_000, weekendMinor: 750_000, depositMinor: 200_000,
  includedGuests: 8, capacity: 12, extraGuestChargeMinor: 30_000,
};
const selection = {
  rentableId: '123e4567-e89b-42d3-a456-426614174000',
  dates: ['2026-10-10', '2026-10-03'], slot: 'day', guests: 8,
};

check('valid leap dates and year boundaries use calendar arithmetic', () => {
  assert.equal(isLocalDate('2024-02-29'), true);
  assert.equal(isLocalDate('2000-02-29'), true);
  assert.equal(addLocalDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addLocalDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addLocalDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addLocalDays('2026-01-01', -1), '2025-12-31');
  assert.equal(parseLocalDate('2026-10-03').toISOString(), '2026-10-03T00:00:00.000Z');
});

check('impossible and malformed dates never roll over silently', () => {
  for (const invalid of ['2026-02-29', '1900-02-29', '2026-02-30', '2026-04-31',
    '0000-01-01', '2026-00-01', '2026-13-01', '2026-10-00', '2026-1-03', ' 2026-10-03',
    '2026-10-03T00:00:00Z', '', null, undefined, 20261003]) {
    assert.equal(isLocalDate(invalid), false, String(invalid));
    assert.throws(() => parseLocalDate(invalid), RangeError);
  }
  assert.throws(() => addLocalDays('2026-10-03', 1.5), RangeError);
  assert.throws(() => addLocalDays('2026-10-03', Number.MAX_SAFE_INTEGER + 1), RangeError);
});

check('India midnight changes the local date while UTC is still yesterday', () => {
  assert.equal(propertyToday('2026-10-02T18:29:59.999Z'), '2026-10-02');
  assert.equal(propertyToday('2026-10-02T18:30:00.000Z'), '2026-10-03');
  assert.equal(isWeekendLocalDate('2026-10-02'), false);
  assert.equal(isWeekendLocalDate('2026-10-03'), true);
  assert.equal(isWeekendLocalDate('2026-10-04'), true);
  assert.equal(isWeekendLocalDate('2026-10-05'), false);
  assert.throws(() => propertyToday('invalid'), RangeError);
  assert.throws(() => propertyToday('2026-10-02T18:30:00Z', 'America/New_York'), RangeError);
});

check('dates, labels and visit instants are unchanged in overseas process timezones', () => {
  const moduleUrl = new URL('../lib/domain/booking-dates.js', import.meta.url).href;
  const probe = `
    import { propertyToday, isWeekendLocalDate, formatLocalDate, visitInterval } from ${JSON.stringify(moduleUrl)};
    process.stdout.write(JSON.stringify({
      today: propertyToday('2026-10-02T18:30:00.000Z'),
      weekend: isWeekendLocalDate('2026-10-03'),
      label: formatLocalDate('2026-10-03'),
      start: visitInterval({ date: '2026-10-03', slot: 'day', schedule: ${JSON.stringify(daySchedule)} }).startsAt,
    }));
  `;
  for (const timeZone of ['Pacific/Honolulu', 'America/New_York', 'Asia/Tokyo']) {
    const actual = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
      encoding: 'utf8', env: { ...process.env, TZ: timeZone }, timeout: 15_000,
      windowsHide: true,
    }));
    assert.deepEqual(actual, {
      today: '2026-10-03', weekend: true, label: formatLocalDate('2026-10-03'),
      start: '2026-10-03T03:30:00.000Z',
    }, timeZone);
  }
});

check('separate visits sort without changing the supplied selection', () => {
  assert.throws(() => normalizeVisitDates(new Array(1)), RangeError);
  const input = ['2026-10-17', '2026-10-03', '2026-10-10'];
  assert.deepEqual(normalizeVisitDates(input), ['2026-10-03', '2026-10-10', '2026-10-17']);
  assert.deepEqual(input, ['2026-10-17', '2026-10-03', '2026-10-10']);
  assert.deepEqual(normalizeVisitDates(['2026-10-03']), ['2026-10-03']);
});

check('inclusive consecutive visits retain each local date and cap the order at ten', () => {
  assert.deepEqual(consecutiveVisitDates('2026-10-03', '2026-10-05'), [
    '2026-10-03', '2026-10-04', '2026-10-05',
  ]);
  assert.deepEqual(consecutiveVisitDates('2024-02-28', '2024-03-01'), [
    '2024-02-28', '2024-02-29', '2024-03-01',
  ]);
  assert.equal(consecutiveVisitDates('2026-10-01', '2026-10-10').length, 10);
  for (const invalid of [[], Array.from({ length: 11 }, (_, i) => addLocalDays('2026-10-01', i)),
    ['2026-10-03', '2026-10-03'], ['2026-02-30'], null]) {
    assert.throws(() => normalizeVisitDates(invalid), RangeError);
  }
  assert.throws(() => consecutiveVisitDates('2026-10-05', '2026-10-03'), RangeError);
  assert.throws(() => consecutiveVisitDates('2026-10-01', '2026-10-11'), RangeError);
});

check('daytime hours preserve exact arrival/departure and turnover buffers', () => {
  assert.deepEqual(visitInterval({ date: '2026-10-03', slot: 'day', schedule: daySchedule }), {
    date: '2026-10-03', slot: 'day', timeZone: 'Asia/Kolkata',
    startsAt: '2026-10-03T03:30:00.000Z', endsAt: '2026-10-03T12:30:00.000Z',
    blockedStartAt: '2026-10-03T03:00:00.000Z', blockedEndAt: '2026-10-03T13:30:00.000Z',
    durationMinutes: 540,
  });
});

check('overnight start dates resolve to the next local departure date', () => {
  const visit = visitInterval({ date: '2026-10-03', slot: 'night', schedule: nightSchedule });
  assert.equal(visit.startsAt, '2026-10-03T12:30:00.000Z');
  assert.equal(visit.endsAt, '2026-10-04T04:30:00.000Z');
  assert.equal(visit.durationMinutes, 960);
  const nextDay = visitInterval({ date: '2026-10-04', slot: 'day', schedule: daySchedule });
  assert.equal(intervalsOverlap(visit, nextDay), true);
});

check('full-day duration comes from its stored window instead of its product label', () => {
  assert.equal(visitInterval({ date: '2026-10-03', slot: 'full_day', schedule: fullDaySchedule }).durationMinutes, 1440);
  assert.equal(visitInterval({
    date: '2026-10-03', slot: 'full_day', schedule: { ...fullDaySchedule, endTime: '08:00' },
  }).durationMinutes, 1380);
  assert.equal(visitInterval({
    date: '2026-10-03', slot: 'full_day', schedule: daySchedule,
  }).durationMinutes, 540);
});

check('missing, disabled or ambiguous schedules cannot become bookable defaults', () => {
  for (const schedule of [undefined, {}, { ...daySchedule, enabled: false },
    { ...daySchedule, startTime: '9 AM' }, { ...daySchedule, endTime: '24:00' },
    { ...daySchedule, endDayOffset: 1 }, { ...daySchedule, endDayOffset: undefined },
    { ...daySchedule, bufferBeforeMinutes: undefined }, { ...daySchedule, bufferAfterMinutes: -1 },
    { ...daySchedule, bufferAfterMinutes: 0.5 }, { ...daySchedule, endTime: '09:00' }]) {
    assert.throws(() => visitInterval({ date: '2026-10-03', slot: 'day', schedule }), RangeError);
  }
  assert.throws(() => visitInterval({ date: '2026-10-03', slot: 'hourly', schedule: daySchedule }), RangeError);
  assert.throws(() => visitInterval({ date: '2026-10-03', slot: 'night', schedule: { ...nightSchedule, endDayOffset: 0 } }), RangeError);
  assert.throws(() => visitInterval({ date: '2026-10-03', slot: 'day', schedule: daySchedule, timeZone: 'UTC' }), RangeError);
});

check('touching half-open reservations are allowed; one minute of turnover conflicts', () => {
  const day = visitInterval({ date: '2026-10-03', slot: 'day', schedule: { ...daySchedule, bufferAfterMinutes: 0 } });
  const night = visitInterval({ date: '2026-10-03', slot: 'night', schedule: nightSchedule });
  assert.equal(intervalsOverlap(day, night), false);
  assert.equal(intervalsOverlap(night, day), false);
  const buffered = visitInterval({ date: '2026-10-03', slot: 'day', schedule: { ...daySchedule, bufferAfterMinutes: 1 } });
  assert.equal(intervalsOverlap(buffered, night), true);
  assert.equal(intervalsOverlap(night, buffered), true);
  assert.throws(() => intervalsOverlap({ ...day, blockedEndAt: day.blockedStartAt }, night), RangeError);
  assert.throws(() => intervalsOverlap({ ...day, blockedStartAt: 'invalid' }, night), RangeError);
});

check('consecutive visits preserve daytime gaps and reject overlapping full-day buffers', () => {
  const dates = ['2026-10-03', '2026-10-04', '2026-10-05'];
  const visits = buildVisitIntervals({ ...bookingWindow, dates });
  assert.equal(visits.length, 3);
  assert.equal(visits[0].endsAt, '2026-10-03T12:30:00.000Z');
  assert.equal(visits[1].startsAt, '2026-10-04T03:30:00.000Z');
  assert.equal(buildVisitIntervals({ ...bookingWindow, dates, slot: 'full_day', schedule: fullDaySchedule }).length, 3);
  assert.throws(() => buildVisitIntervals({
    ...bookingWindow, dates, slot: 'full_day', schedule: { ...fullDaySchedule, bufferAfterMinutes: 30 },
  }), /overlap/);
});

check('same-day cutoff excludes already-started visits and the exact lead-time boundary', () => {
  const today = { ...bookingWindow, now: '2026-10-03T02:30:00.000Z', bookingHorizonDays: 0 };
  assert.throws(() => buildVisitIntervals(today), /outside the booking window/);
  assert.equal(buildVisitIntervals({ ...today, now: '2026-10-03T02:29:59.999Z' }).length, 1);
  assert.throws(() => buildVisitIntervals({ ...today, now: '2026-10-03T03:30:00.000Z', leadTimeMinutes: 0 }), RangeError);
  assert.throws(() => buildVisitIntervals({ ...today, dates: ['2026-10-02'] }), RangeError);
});

check('booking horizon is inclusive in property-local dates and must be configured', () => {
  const horizon = { ...bookingWindow, now: '2026-10-02T18:30:00.000Z', bookingHorizonDays: 2 };
  assert.equal(buildVisitIntervals({ ...horizon, dates: ['2026-10-05'] }).length, 1);
  assert.throws(() => buildVisitIntervals({ ...horizon, dates: ['2026-10-06'] }), RangeError);
  for (const value of [undefined, -1, 0.5, '30']) {
    assert.throws(() => buildVisitIntervals({ ...bookingWindow, bookingHorizonDays: value }), RangeError);
    assert.throws(() => buildVisitIntervals({ ...bookingWindow, leadTimeMinutes: value }), RangeError);
  }
});

check('legacy whole rupees convert explicitly and invalid/overflow values fail', () => {
  assert.deepEqual(calculateBookingPrice({ baseRent: 6000, deposit: 2000 }), {
    rent: 6000, fee: 480, deposit: 2000, advanceDue: 1980,
    balanceDue: 4500, total: 6480, brokerage: 0,
  });
  assert.equal(legacyRupeesToMinor(6000), 600_000);
  assert.equal(legacyRupeesToMinor(0), 0);
  assert.equal(legacyRupeesToMinor(90_071_992_547_409), 9_007_199_254_740_900);
  for (const invalid of [-1, 1.5, NaN, Infinity, '6000', 90_071_992_547_410]) {
    assert.throws(() => legacyRupeesToMinor(invalid), RangeError);
  }
});

check('basis-point arithmetic rounds half up in paise without floating-point totals', () => {
  assert.equal(applyBasisPoints(625, 800), 50);
  assert.equal(applyBasisPoints(1, 5000), 1);
  assert.equal(applyBasisPoints(1, 4999), 0);
  assert.equal(applyBasisPoints(Number.MAX_SAFE_INTEGER, 10_000), Number.MAX_SAFE_INTEGER);
  assert.throws(() => applyBasisPoints(100, 10_001), RangeError);
  assert.throws(() => applyBasisPoints(1.5, 800), RangeError);
  assert.throws(() => applyBasisPoints(100, -1), RangeError);
});

check('extra guests, fees, separate deposits and illustrative advance reconcile', () => {
  const price = calculateVisitPriceMinor({ ...rate, baseRentMinor: 600_000, guests: 10 });
  assert.deepEqual(price, {
    currency: 'INR', baseRentMinor: 600_000, extraGuestsMinor: 60_000,
    rentMinor: 660_000, feeMinor: 52_800, totalMinor: 712_800, depositMinor: 200_000,
    brokerageMinor: 0, illustrativeAdvanceMinor: 217_800, illustrativeBalanceMinor: 495_000,
  });
  assert.equal(price.illustrativeAdvanceMinor + price.illustrativeBalanceMinor, price.totalMinor);
  assert.equal(Object.hasOwn(price, 'collectedMinor'), false);
});

check('slot capacity and guest-charge configuration are mandatory and bounded', () => {
  for (const patch of [{ guests: 0 }, { guests: 13 }, { guests: 2.5 }, { includedGuests: 13 },
    { capacity: 0 }, { extraGuestChargeMinor: undefined }, { extraGuestChargeMinor: -1 },
    { depositMinor: -1 }, { baseRentMinor: 0.5 }]) {
    assert.throws(() => calculateVisitPriceMinor({ ...rate, baseRentMinor: 600_000, guests: 8, ...patch }), RangeError);
  }
  assert.equal(calculateVisitPriceMinor({ ...rate, baseRentMinor: 600_000, guests: 12 }).extraGuestsMinor, 120_000);
});

check('weekdays, weekends, explicit zero overrides and deposits price per visit', () => {
  const quote = priceVisitsMinor({
    dates: ['2026-10-10', '2026-10-05', '2026-10-03'], slot: 'day', guests: 8, rate,
    overridesByDate: { '2026-10-03': { day: 800_000 }, '2026-10-10': { day: 0 } },
  });
  assert.deepEqual(quote.visits.map(({ date, priceSource, baseRentMinor }) => ({ date, priceSource, baseRentMinor })), [
    { date: '2026-10-03', priceSource: 'override', baseRentMinor: 800_000 },
    { date: '2026-10-05', priceSource: 'weekday', baseRentMinor: 600_000 },
    { date: '2026-10-10', priceSource: 'override', baseRentMinor: 0 },
  ]);
  assert.equal(quote.totals.rentMinor, 1_400_000);
  assert.equal(quote.totals.feeMinor, 112_000);
  assert.equal(quote.totals.totalMinor, 1_512_000);
  assert.equal(quote.totals.depositMinor, 600_000);
  assert.equal(priceVisitsMinor({ dates: ['2026-10-04'], slot: 'day', guests: 8, rate }).visits[0].baseRentMinor, 750_000);
  assert.equal(quote.pricingVersion, BOOKING_POLICY.version);
});

check('full-day pricing ignores day/night overrides until a full-day override exists', () => {
  const input = { dates: ['2026-10-03'], slot: 'full_day', guests: 8, rate };
  const halves = { '2026-10-03': { day: 10_000, night: 20_000 } };
  assert.equal(priceVisitsMinor({ ...input, overridesByDate: halves }).visits[0].baseRentMinor, 750_000);
  assert.equal(priceVisitsMinor({ ...input, overridesByDate: { '2026-10-03': { full_day: 900_000 } } }).visits[0].baseRentMinor, 900_000);
  assert.throws(() => priceVisitsMinor({ ...input, overridesByDate: { '2026-10-03': { full_day: -1 } } }), RangeError);
  assert.throws(() => priceVisitsMinor({ ...input, rate: undefined }), RangeError);
});

check('order totals sum rounded per-visit fees rather than rounding their aggregate', () => {
  const tiny = { ...rate, weekdayMinor: 7, weekendMinor: 7, depositMinor: 0, extraGuestChargeMinor: 0 };
  const quote = priceVisitsMinor({ dates: ['2026-10-03', '2026-10-04'], slot: 'day', guests: 8, rate: tiny });
  assert.deepEqual(quote.visits.map((visit) => visit.feeMinor), [1, 1]);
  assert.equal(quote.totals.rentMinor, 14);
  assert.equal(quote.totals.feeMinor, 2);
  assert.equal(quote.totals.totalMinor, 16);
  assert.equal(applyBasisPoints(14, 800), 1);
});

check('oversized guest charges, visit totals and order sums reject unsafe money', () => {
  assert.throws(() => calculateVisitPriceMinor({
    ...rate, guests: 10, baseRentMinor: 0, extraGuestChargeMinor: Number.MAX_SAFE_INTEGER,
  }), RangeError);
  assert.throws(() => calculateVisitPriceMinor({
    ...rate, guests: 8, baseRentMinor: Number.MAX_SAFE_INTEGER,
  }), RangeError);
  assert.throws(() => priceVisitsMinor({
    dates: ['2026-10-03', '2026-10-04'], slot: 'day', guests: 8,
    rate: { ...rate, weekdayMinor: 4_500_000_000_000_000, weekendMinor: 4_500_000_000_000_000 },
  }), RangeError);
});

check('INR formatting preserves paise and Indian grouping even near the safe limit', () => {
  assert.equal(formatINRMinor(0), '₹0');
  assert.equal(formatINRMinor(5), '₹0.05');
  assert.equal(formatINRMinor(10), '₹0.10');
  assert.equal(formatINRMinor(600_000), '₹6,000');
  assert.equal(formatINRMinor(12_345_678), '₹1,23,456.78');
  assert.equal(formatINRMinor(Number.MAX_SAFE_INTEGER), '₹9,00,71,99,25,47,409.91');
  assert.throws(() => formatINRMinor(-1), RangeError);
});

check('owner blocks override positive units and omitted block flags fail closed', () => {
  const days = legacyAvailabilityDays([
    { day: '2026-10-03', slot: 'day', unitsAvailable: 1, blockedByClient: true, priceOverride: 7000 },
    { day: '2026-10-03', slot: 'night', unitsAvailable: 1, blockedByClient: false },
    { day: '2026-10-04', slot: 'day', unitsAvailable: 1 },
    { day: '2026-10-05', slot: 'day', unitsAvailable: 0, blockedByClient: false },
    { day: '2026-10-06', slot: 'day', unitsAvailable: -1, blockedByClient: false },
  ]);
  assert.deepEqual(days['2026-10-03'], { day: false, night: true, full: false, priceOverride: { day: 7000 } });
  for (const date of ['2026-10-04', '2026-10-05', '2026-10-06']) assert.equal(days[date].day, false);
});

check('legacy full-day advisory needs both rows; missing inventory is never invented', () => {
  const days = legacyAvailabilityDays([
    { day: '2026-10-03', slot: 'day', unitsAvailable: 1, blockedByClient: false, priceOverride: 0 },
    { day: '2026-10-03', slot: 'night', unitsAvailable: 1, blockedByClient: false, priceOverride: 8000 },
    { day: '2026-10-04', slot: 'day', unitsAvailable: 1, blockedByClient: false },
    { day: '2026-02-30', slot: 'day', unitsAvailable: 1, blockedByClient: false },
    { day: '2026-10-05', slot: 'full_day', unitsAvailable: 1, blockedByClient: false },
  ]);
  assert.deepEqual(days['2026-10-03'], { day: true, night: true, full: true, priceOverride: { day: 0, night: 8000 } });
  assert.deepEqual(days['2026-10-04'], { day: true, night: false, full: false });
  assert.equal(Object.hasOwn(days, '2026-10-05'), false);
  assert.equal(Object.hasOwn(days, '2026-02-30'), false);
  assert.deepEqual(legacyAvailabilityDays([]), {});
});

check('availability date ranges contain exactly the requested inclusive day count', () => {
  const now = '2026-10-02T18:30:00.000Z';
  assert.deepEqual(availabilityDateRange({ days: 1, now }), { from: '2026-10-03', to: '2026-10-03' });
  assert.deepEqual(availabilityDateRange({ from: '2026-10-01', days: 3, now }), { from: '2026-10-03', to: '2026-10-05' });
  assert.deepEqual(availabilityDateRange({ from: '2026-10-10', days: 3, now }), { from: '2026-10-10', to: '2026-10-12' });
  const range = availabilityDateRange({ days: 120, now });
  assert.equal((parseLocalDate(range.to) - parseLocalDate(range.from)) / 86_400_000 + 1, 120);
  assert.throws(() => availabilityDateRange({ from: '2026-02-30', days: 3, now }), RangeError);
  for (const days of [0, -1, 121, 1.5, '90', undefined]) {
    assert.throws(() => availabilityDateRange({ days, now }), RangeError);
  }
});

check('selection schema canonicalizes dates and permits only the intended INR contract', () => {
  assert.deepEqual(bookingSelectionSchema.parse(selection), {
    ...selection, currency: 'INR', dates: ['2026-10-03', '2026-10-10'],
  });
  for (const patch of [{ currency: 'USD' }, { currency: 'inr' }, { totalMinor: 1 },
    { customerId: selection.rentableId }, { amountRent: 1 }, { quoteVersion: 'approved' },
    { guests: '8' }, { guests: 0 }, { guests: 501 }, { slot: 'hourly' },
    { rentableId: 'guessable-id' }, { dates: [] }, { dates: ['2026-02-30'] },
    { dates: ['2026-10-03', '2026-10-03'] },
    { dates: Array.from({ length: 11 }, (_, i) => addLocalDays('2026-10-01', i)) }]) {
    assert.equal(bookingSelectionSchema.safeParse({ ...selection, ...patch }).success, false, JSON.stringify(patch));
  }
  assert.equal(bookingSelectionSchema.safeParse({
    ...selection, dates: Array.from({ length: 10 }, (_, i) => addLocalDays('2026-10-01', i)),
  }).success, true);
});

check('availability query accepts URL counts while rejecting impossible dates and bounds', () => {
  assert.deepEqual(availabilityQuerySchema.parse({}), { days: 90 });
  assert.deepEqual(availabilityQuerySchema.parse({ from: '2026-10-03', days: '1' }), { from: '2026-10-03', days: 1 });
  for (const input of [{ from: '2026-02-30' }, { days: '0' }, { days: '121' }, { days: '1.5' }]) {
    assert.equal(availabilityQuerySchema.safeParse(input).success, false);
  }
});

console.log(`\nCustomer foundation: ${passed} passed, ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
