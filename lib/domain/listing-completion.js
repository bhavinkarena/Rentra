/**
 * Listing completeness — DERIVED, never stored.
 *
 * Same rule as the onboarding stepper, for the same reason: a stored
 * `current_step` drifts the moment reality changes underneath it. A photo gets
 * deleted, an admin rejects the ownership document, a price row is removed —
 * each should move the bar backwards, and only derivation does that honestly.
 *
 * Sections mirror the nine in docs/rentra-role-flow.html §Stage 2.
 */

export const MIN_PHOTOS = 6;
export const MAX_PHOTOS = 15;

/** Documents that can prove ownership, best first. */
export const OWNERSHIP_DOC_TYPES = [
  {
    id: 'extract_7_12',
    label: '7/12 extract (Satbara)',
    note: 'Strongest for farm land — shows the survey number and the recorded holder.',
    sides: ['single'],
  },
  {
    id: 'electricity_bill',
    label: 'Electricity bill',
    note: 'Easiest to get. Must be under 3 months old.',
    sides: ['single'],
    freshMonths: 3,
  },
  {
    id: 'property_tax',
    label: 'Property tax receipt',
    note: 'Good for built property inside municipal limits.',
    sides: ['single'],
  },
  {
    id: 'index_ii',
    label: 'Index-II',
    note: 'Registration index of the sale deed — far easier to obtain than the deed.',
    sides: ['single'],
  },
  {
    id: 'extract_8a',
    label: '8-A extract',
    note: 'Useful when a family holds several survey numbers.',
    sides: ['single'],
  },
  {
    id: 'sale_deed',
    label: 'Registered sale deed',
    note: 'Definitive, but long — we do not ask for it by default.',
    sides: ['single'],
  },
  {
    id: 'authorisation_letter',
    label: 'Authorisation letter',
    note: "Required if you are not the owner. Send the owner's ID and their ownership document too.",
    sides: ['single'],
    agentOnly: true,
  },
];

/** Venues are often leased commercial premises: prove the right to run it there. */
export const VENUE_OWNERSHIP_DOC_TYPES = [
  {
    id: 'rent_agreement',
    label: 'Rent or lease agreement',
    note: 'For a leased venue — must cover today’s date.',
    sides: ['single'],
  },
  {
    id: 'property_tax',
    label: 'Property tax receipt',
    note: 'If you own the premises.',
    sides: ['single'],
  },
  {
    id: 'electricity_bill',
    label: 'Electricity bill',
    note: 'In the venue’s or your name. Must be under 3 months old.',
    sides: ['single'],
    freshMonths: 3,
  },
  {
    id: 'shop_establishment',
    label: 'Shop & Establishment registration',
    note: 'The business registration for the venue.',
    sides: ['single'],
  },
  {
    id: 'gst_certificate',
    label: 'GST registration certificate',
    note: 'Shows the business name and the premises address.',
    sides: ['single'],
  },
  {
    id: 'sale_deed',
    label: 'Registered sale deed',
    note: 'If you own the land outright.',
    sides: ['single'],
  },
  {
    id: 'noc',
    label: 'Owner’s NOC',
    note: 'If the landlord’s permission is needed to run the venue.',
    sides: ['single'],
  },
  {
    id: 'authorisation_letter',
    label: 'Authorisation letter',
    note: "Required if you are not the owner. Send the owner's ID and their document too.",
    sides: ['single'],
    agentOnly: true,
  },
];

/** Which documents prove a listing, by booking model ('hour' = venue). */
export const ownershipDocTypesFor = (rentalUnit) =>
  rentalUnit === 'hour' ? VENUE_OWNERSHIP_DOC_TYPES : OWNERSHIP_DOC_TYPES;

export function listingCompletion(listing) {
  if (listing?.completion) return listing.completion;
  const sections = [
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
  ].map((id) => ({ id, done: false, minutes: id === 'photos' ? 6 : 2 }));
  return {
    sections,
    total: 10,
    done: 0,
    remaining: sections,
    minutesLeft: 24,
    percent: 0,
    canSubmit: false,
    status: listing?.status || 'draft',
    inReview: false,
    isLive: false,
  };
}
