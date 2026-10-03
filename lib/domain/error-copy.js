/** Owner actions preserve the API code and field errors; only their copy changes. */
const messages = {
  LISTING_CHANGED:
    'This property changed in another tab or by Rentra. Load the latest version before saving. Your typed changes are kept.',
  CALENDAR_CHANGED:
    'Your calendar changed a moment ago. Refresh it and preview your changes again.',
  QUOTE_CHANGED: 'The booking details changed. Refresh this page and try again.',
  INVALID_EVIDENCE_TIME:
    'Choose a time that has already occurred, within the allowed check-in window.',
  PRIOR_EVIDENCE_REQUIRED:
    'Record check-in before check-out, and check-out before completion. Each time must follow the previous record.',
  RESOURCE_HAS_BOOKINGS:
    'This court has upcoming bookings, so it cannot be removed. Block it to stop new bookings.',
  PREVIEW_REQUIRED: 'Review the latest change preview before confirming.',
};
export function ownerErrorCopy({ code, status, message } = {}) {
  if (status === 401) return 'Your session ended. Sign in again to continue.';
  if (code === 'NETWORK_ERROR' || code === 'INVALID_RESPONSE' || Number(status) >= 500)
    return 'We could not confirm the change with Rentra. Refresh to check whether it was saved before trying again.';
  return (
    messages[code] || message || 'This change could not be saved. Check the form and try again.'
  );
}
