export const earningsEnabled = () => process.env.NEXT_PUBLIC_OWNER_V2_EARNINGS !== 'false';
export const EARNINGS_NOTICE =
  'Commission and tax deductions are not applied yet. Booked rent is not a payout amount.';
export const PAYOUT_PROMISE =
  'Rentra pays your earnings after each completed visit, once payouts are switched on. We’ll tell you before the first payout.';
export const earningState = (state) =>
  ({
    confirmed: 'Upcoming',
    handed_over: 'Guest checked in',
    returned: 'Guest checked out',
    completed: 'Completed',
    no_show: 'No show',
    cancelled: 'Cancelled',
    disputed: 'Needs review',
    legacy: 'Older record',
  })[state] || 'In progress';
export const environmentLabel = (value) =>
  ({
    live: 'Live bookings',
    test: 'Test bookings',
    simulated: 'Practice bookings',
    legacy_unknown: 'Older unverified records',
  })[value] || 'Bookings';
export const earningsQuery = (filters) =>
  new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v != null)).toString();
export function earningsTime(value) {
  if (!value) return 'Not recorded';
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(value)) + ' IST'
  );
}
// Story 2.16: separate labels for the guest's payment, refunds and the owner's payout.
export const moneyEnvironmentLabel = (value) =>
  ({ test: 'Test', simulated: 'Simulation', legacy_unknown: 'Legacy' })[value] ?? null;
export const guestPaymentLabel = (state) =>
  ({ paid: 'Paid in full', partial: 'Part paid', unpaid: 'Not paid' })[state] || 'Not recorded';
export const refundLabel = (state) =>
  ({
    none: 'No refunds',
    in_progress: 'Refund in progress',
    needs_review: 'Refund needs review',
    refunded: 'Refunded',
  })[state] || 'Not recorded';
export const payoutStateLabel = (state) =>
  ({
    not_started: 'Not started',
    scheduled: 'Scheduled',
    processing: 'Processing',
    needs_check: 'Being checked',
    paid: 'Paid',
    failed: 'Failed',
    on_hold: 'On hold',
  })[state] || 'Not recorded';
