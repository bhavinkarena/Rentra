import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  apartmentNights,
  apartmentPrice,
  apartmentStayProblem,
} from '../../lib/domain/apartment.js';

/** Story 3.11: mirrors rentra-backend test/services/apartment-booking.test.js. */
const profile = {
  maxAdults: 2,
  maxChildren: 1,
  maxOccupants: 3,
  minNights: 1,
  maxNights: 90,
  arrivalRules: { weekdays: { sat: 3 }, ranges: [] },
  weekdayMinor: 500000,
  weekendMinor: 700000,
  weekendNights: [5, 6],
  cleaningMinor: 100000,
};

test('Fri-Mon prices weekend, weekend, weekday plus cleaning once', () => {
  const nights = apartmentNights(profile, '2027-01-08', '2027-01-11');
  assert.deepEqual(
    nights.map((n) => n.rateMinor),
    [700000, 700000, 500000],
  );
  assert.equal(apartmentPrice(profile, nights).stayMinor, 2000000);
});

test('rules: Saturday minimum, max nights, occupancy', () => {
  const problem = (checkIn, checkOut, adults = 2, childAges = []) =>
    apartmentStayProblem(profile, { checkIn, checkOut, adults, childAges }, '2027-01-01');
  assert.equal(
    problem('2027-01-09', '2027-01-11').message,
    'Minimum 3 nights for Saturday arrival',
  );
  assert.equal(problem('2027-01-04', '2027-04-05').code, 'MAX_NIGHTS');
  assert.equal(problem('2027-01-04', '2027-01-06', 3).code, 'OCCUPANCY');
  assert.equal(problem('2027-01-04', '2027-01-06'), null);
});
