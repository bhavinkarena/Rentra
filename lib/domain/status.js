/**
 * One status vocabulary for owner and customer screens (DS-02).
 *
 * Tone follows who has the next move, never the brand colour:
 * success = live/done, warning = the owner must act, info = with Rentra,
 * neutral = stopped by the owner or ended, danger = Rentra stopped it / failed.
 */
export const STATUS_TONES = {
  success: { badge: 'bg-success-bg text-success ring-success/15', dot: 'bg-success' },
  warning: { badge: 'bg-warning-bg text-warning ring-warning/15', dot: 'bg-warning' },
  info: { badge: 'bg-info-bg text-info ring-info/15', dot: 'bg-info' },
  neutral: { badge: 'bg-ink-100 text-ink-700 ring-ink-700/10', dot: 'bg-ink-500' },
  danger: { badge: 'bg-danger-bg text-danger ring-danger/15', dot: 'bg-danger' },
};

const S = (label, tone, hint) => ({ label, tone, hint });

export const STATUS = {
  property: {
    live: S('Live', 'success', 'Visible to guests'),
    pending_review: S('In review', 'info', 'With the Rentra team'),
    pending_verification: S('Verification scheduled', 'info', 'A call or visit is being arranged'),
    changes_requested: S('Needs changes', 'warning', 'Sent back by Rentra'),
    draft: S('Draft', 'neutral', 'Not submitted yet'),
    paused: S('Paused by you', 'neutral', 'Not taking new bookings'),
    rejected: S('Not approved', 'danger', 'Read why, fix it and resubmit'),
    hidden: S('Hidden by Rentra', 'danger', 'Only Rentra can restore it'),
  },
  booking: {
    confirmed: S('Confirmed', 'success'),
    checked_in: S('Checked in', 'success'),
    handed_over: S('Checked in', 'success'),
    returned: S('Checked out', 'success'),
    no_show: S('No show', 'neutral'),
    checked_out: S('Checked out', 'success'),
    completed: S('Completed', 'success'),
    succeeded: S('Paid', 'success'),
    active: S('Active', 'success'),
    verified: S('Verified', 'success'),
    payment_pending: S('Payment pending', 'warning'),
    hold: S('Payment pending', 'warning'),
    action_needed: S('Action needed', 'warning'),
    invited: S('Invite sent', 'warning'),
    disputed: S('With Rentra', 'info'),
    in_review: S('In review', 'info'),
    open: S('Open', 'info'),
    in_progress: S('With Rentra', 'info'),
    waiting_customer: S('Waiting for you', 'warning'),
    pending: S('Pending', 'info'),
    cancelled: S('Cancelled', 'neutral'),
    expired: S('Expired', 'neutral'),
    blocked: S('Blocked', 'neutral'),
    closed: S('Closed', 'neutral'),
    resolved: S('Resolved', 'success'),
    failed: S('Failed', 'danger'),
    removed: S('Removed', 'danger'),
    rejected: S('Not approved', 'danger'),
  },
  review: {
    published: S('Published', 'success'),
    visible: S('Published', 'success'),
    pending: S('In review', 'info'),
    held: S('In review', 'info'),
    rejected: S('Not published', 'danger'),
    hidden: S('Hidden by Rentra', 'danger'),
    removed: S('Removed', 'danger'),
  },
};

/** Humanise an unknown state so a raw enum never reaches the screen. */
export const humaniseStatus = (state) => {
  const text = String(state ?? 'Unknown').replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function statusMeta(domain, state) {
  const meta = STATUS[domain]?.[state] ?? STATUS.booking[state];
  return meta ?? S(humaniseStatus(state), 'info');
}

// Operator vocabulary is independent of guest/owner wording and next actions.
export const ADMIN_STATUS = {
  property: {
    pending_review: S('Waiting for review', 'info'),
    pending_verification: S('Awaiting verification', 'info'),
    live: S('Published', 'success'),
    draft: S('Draft', 'neutral'),
    rejected: S('Rejected', 'danger'),
    paused: S('Paused by owner', 'neutral'),
    hidden: S('Hidden by Rentra', 'danger'),
  },
  application: {
    submitted: S('Waiting for review', 'info'),
    more_info_needed: S('Information requested', 'warning'),
    approved: S('Approved', 'success'),
    rejected: S('Rejected', 'danger'),
    draft: S('Draft', 'neutral'),
  },
  account: {
    active: S('Active', 'success'),
    suspended: S('Suspended', 'danger'),
    blocked: S('Blocked', 'danger'),
    pending_application: S('Application pending', 'info'),
    inactive: S('Inactive', 'neutral'),
  },
  payment: {
    succeeded: S('Succeeded', 'success'),
    processing: S('Processing', 'info'),
    unknown: S('Outcome unconfirmed', 'warning'),
    created: S('Created', 'neutral'),
    failed: S('Failed', 'danger'),
    cancelled: S('Cancelled', 'neutral'),
  },
  visit: {
    confirmed: S('Confirmed', 'info'),
    checked_in: S('Checked in', 'success'),
    handed_over: S('Checked in', 'success'),
    returned: S('Checked out', 'success'),
    completed: S('Completed', 'success'),
    no_show: S('No show', 'warning'),
    cancelled: S('Cancelled', 'neutral'),
  },
  export: {
    queued: S('Queued', 'info'),
    running: S('Preparing', 'info'),
    completed: S('Ready', 'success'),
    failed: S('Failed', 'danger'),
    expired: S('Expired', 'neutral'),
  },
};

export function adminStatusMeta(domain, state) {
  // Never borrow a label from another domain (e.g. a blocked account is not a closed booking).
  return ADMIN_STATUS[domain]?.[state] ?? S(humaniseStatus(state), 'neutral');
}

/** A draft Rentra sent back is "Needs changes", not a plain draft. */
export function propertyStatus(status, reviewOutcome = null) {
  return status === 'draft' && reviewOutcome === 'changes_requested' ? 'changes_requested' : status;
}
