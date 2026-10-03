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
