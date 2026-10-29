/**
 * Story 3.8: ordinary pet policy for a stay listing (farm/villa and hotel).
 * { status: 'allowed'|'not_allowed', maxPets: 1..5, types: ['dog'|'cat'|'small_other'], maxSize: 'small'|'medium'|'any',
 *   fee: { unit: 'free'|'per_stay'|'per_night'|'per_pet'|'per_pet_night', amount: whole rupees 0..50000 } }
 * Not allowed stores only { status }. Mirrors rentra-backend/src/services/domain/pet-policy.js.
 */
export const PET_TYPES = ['dog', 'cat', 'small_other'];
export const PET_SIZES = ['small', 'medium', 'any'];
export const PET_FEE_UNITS = ['free', 'per_stay', 'per_night', 'per_pet', 'per_pet_night'];
export const ASSISTANCE_ANIMALS_LINE =
  'Assistance animals aren’t treated as pets and aren’t charged pet fees. Contact Rentra support before booking.';

/** What a legacy "pets allowed: yes" means (user decision 29 Oct 2026). */
export const LEGACY_ALLOWED = Object.freeze({
  status: 'allowed',
  maxPets: 1,
  types: [...PET_TYPES],
  maxSize: 'any',
  fee: { unit: 'free', amount: 0 },
});

/** The saved policy, or the one derived from the legacy yes/no flag when none is saved. */
export function effectivePetPolicy(petPolicy, legacyAllowed) {
  if (petPolicy) return petPolicy;
  return legacyAllowed ? structuredClone(LEGACY_ALLOWED) : { status: 'not_allowed' };
}

/** Why `policy` cannot be saved, or null. */
export function petPolicyProblem(policy) {
  if (!policy || typeof policy !== 'object') return 'Choose whether pets are allowed';
  if (policy.status === 'not_allowed') return null;
  if (policy.status !== 'allowed') return 'Choose whether pets are allowed';
  const { maxPets, types, maxSize, fee } = policy;
  if (!Number.isInteger(maxPets) || maxPets < 1 || maxPets > 5) return 'Allow from 1 to 5 pets';
  if (!Array.isArray(types) || !types.length) return 'Choose at least one pet type';
  if (types.some((t) => !PET_TYPES.includes(t)) || new Set(types).size !== types.length)
    return 'Choose dogs, cats or small pets';
  if (!PET_SIZES.includes(maxSize)) return 'Choose the largest pet size';
  if (!fee || !PET_FEE_UNITS.includes(fee.unit)) return 'Choose how the pet fee is charged';
  if (!Number.isInteger(fee.amount) || fee.amount < 0 || fee.amount > 50000)
    return 'Enter the pet fee in whole rupees from 0 to 50,000';
  if (fee.unit === 'free' && fee.amount !== 0) return 'A free pet policy has no fee';
  return null;
}

/** The stored form: exactly the policy fields, types in a fixed order. Call only on a valid policy. */
export function normalizePetPolicy(policy) {
  if (policy.status !== 'allowed') return { status: 'not_allowed' };
  return {
    status: 'allowed',
    maxPets: policy.maxPets,
    types: PET_TYPES.filter((t) => policy.types.includes(t)),
    maxSize: policy.maxSize,
    fee: { unit: policy.fee.unit, amount: policy.fee.amount },
  };
}

/** What guests see: since Story 3.9 charges the fee, the whole policy (not allowed stays bare). */
export function publicPetPolicy(policy) {
  return policy?.status === 'allowed' ? policy : { status: 'not_allowed' };
}

const NOUN = {
  dog: ['dog', 'dogs'],
  cat: ['cat', 'cats'],
  small_other: ['small pet', 'small pets'],
};
const SIZE = { small: 'under 10 kg', medium: 'under 25 kg', any: '' };
const UNIT = {
  per_stay: 'per stay',
  per_night: 'per night',
  per_pet: 'per pet',
  per_pet_night: 'per pet per night',
};

const list = (words) =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`;

/** "up to 2 dogs or cats under 25 kg" */
function limits(policy, sep = ' ') {
  const nouns = list(
    PET_TYPES.filter((t) => policy.types.includes(t)).map(
      (t) => NOUN[t][policy.maxPets > 1 ? 1 : 0],
    ),
  );
  return [`up to ${policy.maxPets} ${nouns}`, SIZE[policy.maxSize]].filter(Boolean).join(sep);
}

export function petFeeText(fee) {
  if (!fee || fee.unit === 'free' || !fee.amount) return 'no pet fee';
  return `₹${fee.amount.toLocaleString('en-IN')} ${UNIT[fee.unit]}`;
}

/** Guest line (with the fee when the policy carries one, Story 3.9), or with { fee: true } the owner preview line. */
export function petPolicyLine(policy, { fee = false } = {}) {
  if (policy?.status !== 'allowed') return 'No pets';
  if (!fee)
    return `Pets allowed: ${limits(policy)}${policy.fee ? ` · ${petFeeText(policy.fee)}` : ''}`;
  const text = limits(policy, ', ');
  return `${text[0].toUpperCase()}${text.slice(1)} · ${petFeeText(policy.fee)}`;
}

/**
 * Story 3.9: the declared pets' charge (paise) inside a quote or booking's rent, from its accepted
 * terms, and that rent without it, so the summary shows "Pet fee" as its own row. 0 without pets.
 */
export function splitPetFee(quote, rentMinor) {
  const petMinor = quote?.policy?.pets?.totalMinor ?? 0;
  return { rentMinor: rentMinor - petMinor, petMinor };
}

/** "2 pets · My pets are dogs under 25 kg", or '' without pets. */
export function petDeclarationLine(pets) {
  if (!pets?.count) return '';
  return `${pets.count} pet${pets.count === 1 ? '' : 's'} · ${pets.confirmation}`;
}
