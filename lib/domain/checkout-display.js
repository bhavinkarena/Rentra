import { CANCELLATION_TIERS } from './pricing.js';

const DAY_MS = 86_400_000;

/**
 * Which checkout screen to show. Browser callbacks never feed this state;
 * only authenticated server reads do. `remainingSeconds` is the hold or quote
 * countdown already shown on the page.
 */
export function checkoutStage(checkout, remainingSeconds) {
  if (!checkout) return 'review';
  if (checkout.needsResolution) return 'resolution';
  if (checkout.state === 'confirmed' && checkout.paymentState === 'succeeded') return 'confirmed';
  if (checkout.state === 'cancelled') return 'cancelled';
  if (['partially_cancelled', 'completed'].includes(checkout.state)) return 'booked';
  if (checkout.state !== 'held') return 'expired';
  if (['unknown', 'dispatched'].includes(checkout.executionState)) return 'pending';
  if (remainingSeconds <= 0) return 'timeUp';
  if (checkout.paymentState === 'failed') return 'failed';
  return 'held';
}

export function mayLaunchCheckout(checkout, remainingSeconds) {
  return (
    checkout?.state === 'held' &&
    !checkout.needsResolution &&
    checkout.paymentState !== 'succeeded' &&
    remainingSeconds > 0 &&
    ['ready', 'linked'].includes(checkout.executionState)
  );
}

/**
 * The refund ladder for one visit, as the guest will live through it.
 *
 * Mirrors CANCELLATION_TIERS: a band's rate applies while at least `days`
 * days remain before arrival, so each band ends `days` days before the visit
 * starts. Neighbouring bands with the same rate merge, and bands that already
 * ended before `now` are dropped — the first step is always the one in force.
 */
export function cancellationSteps(tier, startsAt, now) {
  const policy = CANCELLATION_TIERS[tier];
  const start = new Date(startsAt).getTime();
  const current = new Date(now).getTime();
  if (!policy || !Number.isFinite(start) || !Number.isFinite(current)) return [];
  const steps = [];
  for (const [days, rate] of policy.bands) {
    const until = new Date(start - days * DAY_MS).toISOString();
    if (steps.at(-1)?.rate === rate) steps.at(-1).until = until;
    else steps.push({ rate, until });
  }
  return steps.filter((step) => new Date(step.until).getTime() > current);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Wall-clock parts of an instant in the property's time zone.
 *
 * Only digits are read from Intl: they are identical in every ICU build,
 * whereas names and spacing ("Sep" or "Sept", "am" or "AM") are not — and a
 * server render that disagrees with the browser is a hydration error.
 */
function zoned(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const read = (type) => Number(parts.find((part) => part.type === type)?.value);
  const [year, month, day] = [read('year'), read('month'), read('day')];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { month, day, weekday, hour: read('hour'), minute: read('minute') };
}

/** "9:00 am", in the property's time zone. */
export function clockTime(value, timeZone = 'Asia/Kolkata') {
  const { hour, minute } = zoned(value, timeZone);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

/** Day tile parts for a visit card: weekday, day of month and month. */
export function dayTile(value, timeZone = 'Asia/Kolkata') {
  const { weekday, day, month } = zoned(value, timeZone);
  return { weekday: WEEKDAYS[weekday], day: String(day), month: MONTHS[month - 1] };
}

/** "Mon, 12 Oct" for an instant, in the property's time zone. */
export function shortDay(value, timeZone = 'Asia/Kolkata') {
  const { weekday, day, month } = dayTile(value, timeZone);
  return `${weekday}, ${day} ${month}`;
}

/** "Mon, 12 Oct" for a property-local `YYYY-MM-DD` date. */
export function localDay(date) {
  const [year, month, day] = String(date).split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${day} ${MONTHS[month - 1]}`;
}
