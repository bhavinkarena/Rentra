'use server';

import { partnerApi } from '@/lib/api/endpoints';
import { runApiAction } from '@/lib/api/action';

/**
 * The partner surface: onboarding application, KYC, settings, and the
 * listing wizard.
 *
 * The listing steps take their listing id from the form rather than from an
 * argument — that is how the forms were already built, and the API reads it
 * the same way, so the id travels in exactly one place.
 */

const listingId = (formData) => String(formData.get('id') ?? '');

/* -------------------------------- application ------------------------------- */

export async function saveDetails(_previous, formData) {
  return runApiAction(() => partnerApi.saveDetails(formData));
}

export async function savePayout(_previous, formData) {
  return runApiAction(() => partnerApi.savePayout(formData));
}

export async function saveConsent(_previous, formData) {
  return runApiAction(() => partnerApi.saveConsent(formData));
}

export async function submitApplication() {
  return runApiAction(() => partnerApi.submitApplication());
}

export async function withdrawApplication() {
  return runApiAction(() => partnerApi.withdrawApplication());
}

/* ----------------------------------- KYC ----------------------------------- */

export async function uploadKycDocuments(_previous, formData) {
  return runApiAction(() => partnerApi.uploadDocuments(formData));
}

export async function deleteKycDocument(_previous, formData) {
  return runApiAction(() => partnerApi.deleteDocument(formData));
}

/* --------------------------------- settings -------------------------------- */

export async function saveAccountSettings(_previous, formData) {
  return runApiAction(() => partnerApi.saveAccount(formData));
}

export async function savePayoutDestination(_previous, formData) {
  return runApiAction(() => partnerApi.savePayoutDestination(formData));
}

/* ----------------------------- the listing wizard ---------------------------- */

export async function createListingFromBasics(_previous, formData) {
  return runApiAction(() => partnerApi.createListing(formData));
}

const step = (name) => async (_previous, formData) =>
  runApiAction(() => partnerApi.saveStep(listingId(formData), name, formData));

export const saveBasics = step('basics');
export const saveLocation = step('location');
export const saveCapacity = step('capacity');
export const saveAmenities = step('amenities');
export const saveRules = step('rules');
export const savePricing = step('pricing');
export const saveTerms = step('terms');

export async function uploadListingPhotos(_previous, formData) {
  return runApiAction(() => partnerApi.addPhotos(listingId(formData), formData));
}

export async function removeListingPhoto(_previous, formData) {
  return runApiAction(() => partnerApi.removePhoto(listingId(formData), formData));
}

export async function reorderListingPhotos(_previous, formData) {
  return runApiAction(() => partnerApi.reorderPhotos(listingId(formData), formData));
}

export async function uploadOwnershipDocument(_previous, formData) {
  return runApiAction(() => partnerApi.uploadOwnershipDocument(listingId(formData), formData));
}

export async function submitListing(_previous, formData) {
  return runApiAction(() => partnerApi.submitListing(listingId(formData), formData));
}

export async function toggleListingPause(_previous, formData) {
  return runApiAction(() => partnerApi.togglePause(listingId(formData), formData));
}

/* -------------------------------- the calendar ------------------------------- */

/**
 * The calendar forms carry the listing as `rentableId`, not `id` — that is
 * the name the inventory tables use and the API reads the same field, so the
 * id is spelled one way from the form all the way down.
 */
const rentableId = (formData) => String(formData.get('rentableId') ?? '');

export async function saveSchedule(_previous, formData) {
  return runApiAction(() => partnerApi.saveSchedule(rentableId(formData), formData));
}

export async function saveOverride(_previous, formData) {
  return runApiAction(() => partnerApi.savePriceOverride(rentableId(formData), formData));
}

export async function addOpenDates(_previous, formData) {
  return runApiAction(() => partnerApi.openDates(rentableId(formData), formData));
}

export async function blockDates(_previous, formData) {
  return runApiAction(() => partnerApi.blockDates(rentableId(formData), formData));
}

export async function unblockDates(_previous, formData) {
  return runApiAction(() => partnerApi.unblockDates(rentableId(formData), formData));
}

/* --------------------------------- reviews --------------------------------- */

export async function ownerReviewReply(_previous, formData) {
  return runApiAction(() => partnerApi.replyToReview(formData));
}

export async function ownerReviewReport(_previous, formData) {
  return runApiAction(() => partnerApi.reportReview(formData));
}

/* ------------------------------ visit lifecycle ------------------------------ */

export async function recordOwnerVisit(_previous, formData) {
  return runApiAction(() => partnerApi.recordVisit(formData));
}

export async function reportOwnerIncident(_previous, formData) {
  return runApiAction(() => partnerApi.reportIncident(formData));
}

export async function createOwnerCase(_previous, formData) {
  return runApiAction(() => partnerApi.createCase(formData));
}

export async function addOwnerCaseUpdate(_previous, formData) {
  return runApiAction(() => partnerApi.caseUpdate(formData));
}
