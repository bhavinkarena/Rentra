import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectivePetPolicy,
  petPolicyLine,
  petPolicyProblem,
  publicPetPolicy,
  petDeclarationLine,
  splitPetFee,
} from '../../lib/domain/pet-policy.js';

const allowed = {
  status: 'allowed',
  maxPets: 2,
  types: ['dog', 'cat'],
  maxSize: 'medium',
  fee: { unit: 'per_pet_night', amount: 500 },
};

test('Story 3.8: mirror derives, validates and words the pet policy like the server', () => {
  assert.deepEqual(effectivePetPolicy(null, false), { status: 'not_allowed' });
  assert.equal(effectivePetPolicy(null, true).maxPets, 1);
  assert.equal(petPolicyProblem({ ...allowed, types: [] }), 'Choose at least one pet type');
  assert.ok(petPolicyProblem({ ...allowed, maxPets: 6 }));
  assert.ok(petPolicyProblem({ ...allowed, fee: { unit: 'per_stay', amount: 50001 } }));
  assert.ok(petPolicyProblem({ ...allowed, fee: { unit: 'per_stay', amount: NaN } }));
  assert.equal(petPolicyProblem(allowed), null);
  assert.equal(
    petPolicyLine(allowed, { fee: true }),
    'Up to 2 dogs or cats, under 25 kg · ₹500 per pet per night',
  );
  assert.equal(
    petPolicyLine(publicPetPolicy(allowed)),
    'Pets allowed: up to 2 dogs or cats under 25 kg · ₹500 per pet per night',
  );
  assert.equal(petPolicyLine({ status: 'not_allowed' }), 'No pets');
});

test('Story 3.9: the pet fee is its own summary row inside the rent', () => {
  const pets = { count: 2, confirmation: 'My pets are dogs', totalMinor: 40000 };
  assert.deepEqual(splitPetFee({ policy: { pets } }, 250000), {
    rentMinor: 210000,
    petMinor: 40000,
  });
  assert.deepEqual(splitPetFee({ policy: {} }, 250000), { rentMinor: 250000, petMinor: 0 });
  assert.equal(petDeclarationLine(pets), '2 pets · My pets are dogs');
  assert.equal(petDeclarationLine(null), '');
});
