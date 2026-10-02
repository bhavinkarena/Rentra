'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authApi, partnerApi } from '@/lib/api/endpoints';
import { safeReturnPath } from '@/lib/domain/portal-state';
import { runApiAction as sharedApiAction } from '@/lib/api/action';
import { ownerErrorCopy } from '@/lib/domain/error-copy';
async function runApiAction(call, options) {
  const result = await sharedApiAction(call, options);
  return result?.error
    ? {
        ...result,
        error: ownerErrorCopy({ code: result.code, status: result.status, message: result.error }),
      }
    : result?.ok || result?.version
      ? { ...result, savedAt: new Date().toISOString() }
      : result;
}

/**
 * The partner surface: onboarding application, KYC, settings, and the
 * listing wizard.
 *
 * The listing steps take their listing id from the form rather than from an
 * argument — that is how the forms were already built, and the API reads it
 * the same way, so the id travels in exactly one place.
 */

const listingId = (formData) => String(formData.get('id') ?? '');

async function onboardingAction(call) {
  const result = await runApiAction(call);
  if (
    result.ok &&
    /^\/partner\/onboarding\/(details|phone|kyc|payout|consent|review)(?:\?mobile=1)?$/.test(
      result.next,
    )
  ) {
    revalidatePath('/partner', 'layout');
    redirect(result.next);
  }
  return result;
}

export async function saveOwnerGuide(_previous, form) {
  const input = {};
  for (const key of [
    'welcomeSeenAt',
    'tourStartedAt',
    'tourResumedAt',
    'tourCompletedAt',
    'tourSkippedAt',
    'checklistDismissedAt',
    'intendedVertical',
  ]) {
    const value = form.get(key);
    if (value !== null) input[key] = key === 'intendedVertical' ? value : value === 'true';
  }
  const result = await runApiAction(() => partnerApi.saveGuideState(input));
  if (!result.error && !result.errors) {
    revalidatePath('/partner', 'layout');
    const next = form.get('next');
    if (['/partner', '/partner?tour=1', '/partner/onboarding/details'].includes(next))
      redirect(next);
  }
  return result;
}

export async function saveListingHours(_previous, form) {
  return runApiAction(() => partnerApi.saveStep(String(form.get('rentableId')), 'hours', form));
}

/* -------------------------------- application ------------------------------- */

export async function saveDetails(_previous, formData) {
  return onboardingAction(() => partnerApi.saveDetails(formData));
}

export async function savePayout(_previous, formData) {
  return onboardingAction(() => partnerApi.savePayout(formData));
}

export async function saveConsent(_previous, formData) {
  return onboardingAction(() => partnerApi.saveConsent(formData));
}

export async function submitApplication() {
  return runApiAction(() => partnerApi.submitApplication());
}

export async function withdrawApplication() {
  return runApiAction(() => partnerApi.withdrawApplication());
}

/* ----------------------------------- KYC ----------------------------------- */

export async function uploadKycDocuments(_previous, formData) {
  return onboardingAction(() => partnerApi.uploadDocuments(formData));
}

export async function deleteKycDocument(_previous, formData) {
  return runApiAction(() => partnerApi.deleteDocument(formData));
}

/* --------------------------------- settings -------------------------------- */

export async function saveAccountSettings(_previous, formData) {
  return runApiAction(() => partnerApi.saveAccount(formData));
}

/** CP21: preview, then submit a new payout destination version. */
export async function changePayoutDestination(_previous, formData) {
  return runApiAction(() => partnerApi.changePayoutDestination(formData));
}

export async function submitPayoutDraft(_previous, formData) {
  return runApiAction(() => partnerApi.submitPayoutDraft(formData));
}

export async function requestPayoutIdentity(_previous, formData) {
  return runApiAction(() => partnerApi.requestPayoutIdentity(formData));
}
export async function confirmPayoutIdentity(_previous, formData) {
  return runApiAction(() => partnerApi.confirmPayoutIdentity(formData));
}

/* ----------------------------- the listing wizard ---------------------------- */

export async function createListingFromBasics(_previous, formData) {
  return runApiAction(() => partnerApi.createListing(formData));
}

const step = (name) => async (_previous, formData) =>
  runApiAction(() => partnerApi.saveStep(listingId(formData), name, formData));

export const saveBasics = step('basics');
export const saveType = step('type');
export const saveAvailability = step('availability');
export async function saveDraftStep(name, form) {
  form.set('autosave', '1');
  return runApiAction(() =>
    partnerApi.saveStep(String(form.get('id') || form.get('rentableId')), name, form),
  );
}
export async function previewListingPrice(id, rentMinor) {
  return runApiAction(() => partnerApi.pricePreview(id, { rentMinor }));
}
export async function deletePropertyDraft(_previous, form) {
  return runApiAction(() => partnerApi.deleteDraft(String(form.get('id')), form), {
    redirectTo: '/partner/listings?deleted=1',
  });
}
export const saveLocation = step('location');
export const saveCapacity = step('capacity');
/** Courts of a time-booked venue: `resources` is one JSON field. */
export const saveVenue = step('venue');
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

/* --------------------------------- updates --------------------------------- */

/** The inbox, the dashboard and the navigation badge all show read state. */
function refreshUpdates(result) {
  if (!result?.error) for (const path of ['/partner/updates', '/partner']) revalidatePath(path);
  return result;
}

export async function markUpdatesRead(_previous, formData) {
  return refreshUpdates(await runApiAction(() => partnerApi.readUpdates(formData)));
}

/**
 * Open an update: mark it read, then go to the record it is about. A failed
 * read is reported instead of navigating, so the read state never silently
 * disagrees with what the client did. Only in-portal paths are followed.
 */
export async function openUpdate(_previous, formData) {
  const result = await runApiAction(() => partnerApi.readUpdates(formData));
  if (result?.error) return result;
  refreshUpdates(result);
  redirect(safeReturnPath(String(formData.get('href') ?? ''), '/partner', '/partner/updates'));
}

export async function saveUpdatePreferences(_previous, formData) {
  return refreshUpdates(await runApiAction(() => partnerApi.saveUpdatePreferences(formData)));
}

/* ----------------------------------- team ----------------------------------- */

function refreshTeam(result) {
  if (!result?.error) revalidatePath('/partner/team');
  return result;
}

/** Returns the one-time token; the page builds the link and shows it once. */
export async function inviteCaretaker(_previous, formData) {
  return refreshTeam(await runApiAction(() => partnerApi.inviteStaff(formData)));
}

export async function issueCaretakerLink(_previous, formData) {
  return refreshTeam(
    await runApiAction(() => partnerApi.staffLink(String(formData.get('staffId') ?? ''))),
  );
}

export async function changeCaretakerAccess(_previous, formData) {
  return refreshTeam(
    await runApiAction(() =>
      partnerApi.staffAccess(String(formData.get('staffId') ?? ''), formData),
    ),
  );
}

export async function revokeCaretaker(_previous, formData) {
  return refreshTeam(
    await runApiAction(() =>
      partnerApi.revokeStaff(String(formData.get('staffId') ?? ''), formData),
    ),
  );
}

export async function openOwnerSupport(_previous, form) {
  return runApiAction(() => partnerApi.openSupport(form));
}
export async function replyOwnerSupport(_previous, form) {
  return runApiAction(() => partnerApi.replySupport(form.get('id'), form));
}

/** Guide event recording does not refresh an in-progress welcome or tour. */
export async function recordOwnerGuide(input) {
  return runApiAction(() => partnerApi.saveGuideState(input));
}

export async function signPropertyPhoto(id) {
  return runApiAction(() => partnerApi.signPhoto(id));
}
export async function attachPropertyPhoto(id, input) {
  return runApiAction(() => partnerApi.attachPhoto(id, input));
}

export async function loadCalendarDay(id, date) {
  return runApiAction(() => partnerApi.calendarDay(id, date));
}
export async function changeCalendarSelection(_previous, form) {
  const id = String(form.get('rentableId'));
  const result = await runApiAction(() => partnerApi.calendarBulk(id, form));
  if (result.ok) {
    revalidatePath('/partner/calendar');
    revalidatePath(`/partner/listings/${id}/calendar`);
  }
  return result;
}

export async function saveBookingNote(_previous, form) {
  const id = String(form.get('orderId'));
  const result = await runApiAction(() =>
    partnerApi.saveOwnerNote(id, String(form.get('body') || '')),
  );
  if (result.ok) revalidatePath(`/partner/bookings/${id}`);
  return result;
}
export async function saveArrivalGuide(_previous, form) {
  const id = String(form.get('rentableId'));
  const result = await runApiAction(() =>
    partnerApi.saveArrivalGuide(id, {
      landmark: String(form.get('landmark') || ''),
      parking: String(form.get('parking') || ''),
      gatePhotoKey: String(form.get('gatePhotoKey') || ''),
      caretakerVisible: form.get('caretakerVisible') === 'on',
    }),
  );
  if (result.ok) revalidatePath(`/partner/listings/${id}/arrival-guide`);
  return result;
}
export async function createOfflineBooking(id, input) {
  const result = await runApiAction(() => partnerApi.offlineBooking(id, input));
  if (result.ok) {
    revalidatePath('/partner/calendar');
    revalidatePath(`/partner/listings/${id}/calendar`);
  }
  return result;
}
export async function newCalendarFeed(id) {
  return runApiAction(() => partnerApi.regenerateCalendarFeed(id));
}

export async function turnOnAutoOpen(id) {
  const result = await runApiAction(() => partnerApi.setAutoOpen(id, true));
  if (!result.error) {
    revalidatePath('/partner');
    revalidatePath(`/partner/listings/${id}/booking-rules`);
  }
  return result;
}

export async function undoCalendarChange(id, token) {
  const result = await runApiAction(() => partnerApi.undoCalendar(id, token));
  if (result.ok) {
    revalidatePath('/partner/calendar');
    revalidatePath(`/partner/listings/${id}/calendar`);
  }
  return result;
}

export async function saveOwnerNotifications(_previous, input) {
  return runApiAction(() => partnerApi.saveOwnerNotifications(input));
}

export async function signOutOtherOwnerDevices() {
  return runApiAction(() => partnerApi.signOutOthers());
}
export async function requestOwnerContact(_previous, form) {
  return runApiAction(() =>
    partnerApi.requestContactChange({
      channel: form.get('channel'),
      identifier: form.get('identifier'),
    }),
  );
}
export async function confirmOwnerContact(_previous, form) {
  const result = await runApiAction(() =>
    partnerApi.confirmContactChange({
      challengeId: form.get('challengeId'),
      code: form.get('code'),
    }),
  );
  if (result.message) revalidatePath('/partner', 'layout');
  return result;
}

export async function requestOwnerData(_previous, form) {
  const result = await runApiAction(() =>
    partnerApi.requestOwnerPrivacy({ kind: form.get('kind') }),
  );
  revalidatePath('/partner/settings/privacy');
  return result;
}
