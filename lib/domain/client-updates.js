/**
 * Wording and destinations for the client updates inbox and task list (CP15).
 * Pure: the API stores the event and its client-safe detail; this decides how
 * it reads and where it leads.
 */

const REVIEW = {
  changes_requested: 'Rentra asked for changes',
  rejected: 'Rentra did not approve the submission',
  approved_for_visit: 'Approved for verification',
};
const VERIFICATION = {
  passed: 'Verification passed',
  failed: 'Verification did not pass',
  no_show: 'Verification visit missed',
};

const TITLES = {
  listing_review_decided: (d) => REVIEW[d.outcome] ?? 'Review decision recorded',
  verification_scheduled: (d) =>
    d.mode === 'physical' ? 'Site visit scheduled' : 'Verification call scheduled',
  verification_rescheduled: () => 'Verification moved',
  verification_cancelled: () => 'Verification cancelled',
  verification_recorded: (d) => VERIFICATION[d.outcome] ?? 'Verification recorded',
  listing_published: () => 'Property published',
  listing_hidden: () => 'Rentra hid this property',
  listing_restored: () => 'Rentra restored this property',
  listing_corrected: () => 'Rentra corrected this property',
  review_published: () => 'New guest review',
  review_report_closed: () => 'Rentra reviewed your report',
  dispute_opened: () => 'Dispute opened',
  dispute_response_requested: () => 'Rentra needs your reply',
  dispute_resolved: () => 'Dispute resolved',
  caretaker_evidence: () => 'Caretaker recorded a visit update',
  caretaker_revoked: () => 'Caretaker removed during a visit',
  dates_running_out: () => 'Your open dates are running out',
  checkout_overdue: () => 'Record guest check-out',
  arrival_today: () => 'Guest arriving today',
  arrival_tomorrow: () => 'Guest arriving tomorrow',
  application_approved: () => 'Owner verification approved',
  application_more_info: () => 'Rentra needs more information',
  application_rejected: () => 'Owner application not approved',
  booking_confirmed: () => 'New booking confirmed',
  visits_cancelled: () => 'Visits cancelled',
  support_reply: () => 'Rentra replied to your support request',
  payout_destination_failed: () => 'Payout destination failed review — submit a new one',
  case_created: () => 'Case opened',
  case_message: () => 'Rentra replied on a case',
  case_assigned: () => 'Case assigned',
  case_resolved: () => 'Case resolved',
};

export const CATEGORY_LABEL = {
  review: 'Reviews',
  team: 'Caretakers',
  account: 'Account',
  property: 'Properties',
  booking: 'Bookings',
  case: 'Cases',
};

/** What each informational category covers, for the preferences form. */
export const MUTABLE_CATEGORY_HINT = {
  property: 'Verification scheduling, publication, restores and corrections',
  booking: 'New bookings and cancelled visits',
  case: 'Rentra messages on booking and support cases',
};

export function updateTitle(update) {
  const title = TITLES[update?.action];
  return title
    ? title(update.detail ?? {})
    : String(update?.action ?? 'Update').replaceAll('_', ' ');
}

/** The record the update is about; never an external URL. */
export function updateHref(update) {
  if (/^[0-9a-f-]{36}$/i.test(update.detail?.disputeId || ''))
    return `/partner/disputes/${update.detail.disputeId}`;
  if (update.detail?.reviewId) return '/partner/reviews';
  if (update.action === 'caretaker_revoked') return '/partner/team';
  if (String(update.action || '').startsWith('application_')) return '/partner';
  if (update.action === 'dates_running_out' && update.rentableId)
    return `/partner/listings/${update.rentableId}/calendar`;
  if (update?.action === 'support_reply' && /^[0-9a-f-]{36}$/i.test(update.detail?.supportId || ''))
    return `/partner/support/${update.detail.supportId}`;
  if (update?.action === 'payout_destination_failed') return '/partner/settings/payout';
  if (update?.orderId) return `/partner/bookings/${update.orderId}`;
  if (update?.rentableId) return `/partner/listings/${update.rentableId}/overview`;
  return '/partner';
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const TASKS = {
  visits_action: (n) =>
    `${plural(n, 'booking needs', 'bookings need')} you: check-in, check-out or inspection`,
  properties_attention: (n) =>
    n === 1
      ? '1 property is a draft or needs changes'
      : `${n} properties are drafts or need changes`,
  properties_resubmit: (n) =>
    `${plural(n, 'property was', 'properties were')} edited and must be resubmitted`,
  properties_unbookable: (n) =>
    `${plural(n, 'live property is', 'live properties are')} not bookable yet`,
  updates_action: (n) => `${plural(n, 'update needs', 'updates need')} your action`,
  properties_hidden: (n) => `${plural(n, 'property is', 'properties are')} hidden by Rentra`,
  properties_review: (n) => `${plural(n, 'property is', 'properties are')} with Rentra for review`,
  visits_with_rentra: (n) =>
    `${plural(n, 'booking is', 'bookings are')} with Rentra: disputes or visit hours`,
  visits_today: (n) => `${plural(n, 'booking has', 'bookings have')} a visit today`,
  updates_unread: (n) => plural(n, 'unread update', 'unread updates'),
};

/** Tasks that apply now: required work first, each with its own list. */
export function visibleTasks(tasks = []) {
  return tasks
    .filter(
      (task) =>
        task.count > 0 &&
        (task.label || TASKS[task.key]) &&
        !(
          task.key === 'updates_unread' &&
          tasks.some((t) => t.key === 'updates_action' && t.count > 0)
        ),
    )
    .map((task) => ({ ...task, label: task.label ?? TASKS[task.key](task.count) }))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'action' ? -1 : 1));
}
