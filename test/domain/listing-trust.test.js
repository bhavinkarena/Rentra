import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trustFieldsTouched, trustFieldSentence } from '../../lib/domain/listing-trust.js';

const server = [
  'title',
  'categoryId',
  'location',
  'exactAddress',
  'capacity',
  'bedrooms',
  'amenities',
  'houseRules',
  'photos',
];

test('only edited inputs behind a server trust field ask for review', () => {
  assert.deepEqual(trustFieldsTouched(['description', 'highlight', 'day_weekday'], server), []);
  assert.deepEqual(trustFieldsTouched(['title', 'description'], server), ['title']);
  assert.deepEqual(trustFieldsTouched(['lat', 'lng', 'exactAddress'], server), [
    'location',
    'exactAddress',
  ]);
  assert.deepEqual(trustFieldsTouched(['value:abc', 'petsAllowed'], server), [
    'amenities',
    'houseRules',
  ]);
  assert.deepEqual(trustFieldsTouched(['court-k1-indoor'], server), ['courts']);
  // A field the server no longer reviews is never warned about.
  assert.deepEqual(trustFieldsTouched(['title'], ['photos']), []);
});

test('the copy names every server trust field', () => {
  assert.equal(
    trustFieldSentence(server),
    'the title, the category, the map pin, the address, guest capacity, bedrooms, amenities, house rules or new photos',
  );
  assert.equal(trustFieldSentence(['title']), 'the title');
});
