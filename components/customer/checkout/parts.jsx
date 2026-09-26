import Image from 'next/image';
import {
  Baby,
  CalendarDays,
  Check,
  CigaretteOff,
  CircleCheck,
  Clock,
  FlaskConical,
  House,
  Lock,
  MapPin,
  PartyPopper,
  PawPrint,
  ScrollText,
  ShieldCheck,
  Timer,
  Users,
  UtensilsCrossed,
  VolumeX,
  Waves,
  Wine,
} from 'lucide-react';
import Rating from '@/components/rentra/Rating';
import { SLOT_ICONS } from '@/components/rentra/slot-icons';
import { SLOTS, CANCELLATION_TIERS } from '@/lib/domain/pricing';
import { formatINRMinor as money } from '@/lib/domain/booking-money';
import { cancellationSteps, clockTime, dayTile, shortDay } from '@/lib/domain/checkout-display';

/*
 * Presentational pieces of the checkout screens. No state or handlers live
 * here, so the server-rendered review page and the client checkout share them.
 */

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function visitHours(quote) {
  const first = quote.visits[0];
  if (!first) return '';
  const nextDay = quote.selection.slot === 'night' ? ' next day' : '';
  return `${clockTime(first.startsAt, quote.timeZone)} – ${clockTime(first.endsAt, quote.timeZone)}${nextDay}`;
}

export function visitDates(quote) {
  const days = quote.visits.map((visit) => shortDay(visit.startsAt, quote.timeZone));
  return days.length > 3
    ? `${days.slice(0, 2).join(' · ')} + ${days.length - 2} more`
    : days.join(' · ');
}

export function TestBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info-bg px-3 py-1 text-xs font-semibold text-info">
      <FlaskConical className="size-3.5" aria-hidden="true" />
      Test mode · no real money
    </span>
  );
}

const STEPS = ['Review', 'Pay', 'Confirmed'];
export function Stepper({ current }) {
  return (
    <ol
      aria-label="Booking progress"
      className="flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm"
    >
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="flex items-center gap-2 sm:gap-3"
          >
            {index ? (
              <span
                aria-hidden="true"
                className={`h-0.5 w-5 rounded-full sm:w-10 ${done || active ? 'bg-brand-600' : 'bg-ink-200'}`}
              />
            ) : null}
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs ${
                done
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : active
                    ? 'border-brand-600 bg-card text-brand-800'
                    : 'border-ink-200 bg-card text-ink-500'
              }`}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : index + 1}
            </span>
            <span className={active ? 'text-ink-900' : done ? 'text-brand-700' : 'text-ink-500'}>
              {label}
              {done ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function HoldTimer({ label, remaining }) {
  const over = remaining <= 0;
  const tone = over
    ? 'bg-danger-bg text-danger'
    : remaining <= 120
      ? 'bg-warning-bg text-warning'
      : 'bg-brand-50 text-brand-800';
  return (
    <p
      role="timer"
      aria-label="Time remaining"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${tone}`}
    >
      <Timer className="size-4 shrink-0" aria-hidden="true" />
      {over ? (
        'Time’s up'
      ) : (
        <span>
          {label}{' '}
          <span className="tabular">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
        </span>
      )}
    </p>
  );
}

export function StayPhoto({ photo, title, className = '', sizes }) {
  return (
    <div className={`relative overflow-hidden bg-brand-50 ${className}`}>
      {photo ? (
        <Image
          src={photo.url}
          alt={photo.alt || title}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center text-brand-600">
          <House className="size-9" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

/** Icon rows: the three facts a guest checks first. `row` lays them side by side from `sm`. */
export function StayFacts({ quote, row = false, className = '' }) {
  const SlotIcon = SLOT_ICONS[quote.selection.slot] ?? Clock;
  const rows = [
    [CalendarDays, 'Dates', visitDates(quote), plural(quote.visits.length, 'visit')],
    [SlotIcon, 'Visit type', SLOTS[quote.selection.slot]?.label ?? 'Visit', visitHours(quote)],
    [Users, 'Guests', plural(quote.selection.guests, 'guest'), 'per visit'],
  ];
  return (
    <dl className={`${row ? 'grid gap-3 sm:grid-cols-3 sm:gap-4' : 'space-y-3'} ${className}`}>
      {rows.map(([Icon, label, value, detail]) => (
        <div key={label} className="flex items-start gap-3">
          <dt className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Icon className="size-4" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </dt>
          <dd className="min-w-0">
            <span className="block text-sm font-semibold text-ink-900">{value}</span>
            <span className="block text-xs text-ink-600">{detail}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Line({ label, value, strong = false, className = '' }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${strong ? 'font-bold text-ink-900' : ''} ${className}`}
    >
      <dt>{label}</dt>
      <dd className="tabular" data-money>
        {value}
      </dd>
    </div>
  );
}

/** `titled={false}` when the surrounding section already says "Price details". */
export function PriceDetails({ quote, paid = false, titled = true }) {
  const { totals, payment } = quote;
  const later = payment.remainingMinor > 0;
  return (
    <div>
      {titled ? <h3 className="mb-3 text-sm font-semibold text-ink-900">Price details</h3> : null}
      <dl className="space-y-2 text-sm text-ink-700">
        <Line
          label={`Rent · ${plural(quote.visits.length, 'visit')}`}
          value={money(totals.rentMinor)}
        />
        <Line label="Platform fee" value={money(totals.feeMinor)} />
        <Line
          label="Total"
          value={money(totals.totalMinor)}
          strong
          className="border-t border-border pt-2.5"
        />
      </dl>
      <dl className="mt-4 space-y-1.5 rounded-xl bg-brand-50 p-3.5 text-sm">
        <div className="flex items-baseline justify-between gap-4 font-semibold text-brand-900">
          <dt>
            {paid ? 'Paid now' : 'Pay now'}
            {later ? ' · advance' : ''}
          </dt>
          <dd className="text-base tabular" data-money>
            {money(payment.expectedMinor)}
          </dd>
        </div>
        {later ? (
          <div className="flex items-baseline justify-between gap-4 text-ink-700">
            <dt>Remaining, not collected now</dt>
            <dd className="tabular" data-money>
              {money(payment.remainingMinor)}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3 flex items-start gap-2.5 text-sm text-ink-700">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink-900" data-money>
            {money(totals.depositMinor)}
          </strong>{' '}
          refundable deposit, paid separately
        </span>
      </p>
    </div>
  );
}

function PropertyName({ data }) {
  return (
    <div className="min-w-0">
      <h2 className="text-h4 leading-snug text-ink-900">{data.title}</h2>
      {data.area ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-600">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {data.area}
        </p>
      ) : null}
      {data.reviewCount != null ? (
        <Rating value={data.rating ?? 0} count={data.reviewCount} className="mt-1.5" />
      ) : null}
    </div>
  );
}

/** Phones: the place being booked, as a compact row above the trip details. */
export function PropertyHeader({ data, className = '' }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-border bg-card p-3 ${className}`}
    >
      <StayPhoto
        photo={data.photo}
        title={data.title}
        sizes="96px"
        className="size-20 shrink-0 rounded-xl"
      />
      <PropertyName data={data} />
    </div>
  );
}

export function SecureNote() {
  return (
    <p className="flex items-start gap-2.5 text-xs text-ink-600">
      <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Secure test payment by Razorpay. No real money is charged; the deposit and any remaining
      amount are not part of this test payment.
    </p>
  );
}

/** Desktop: the sticky "what am I booking" card with the price, and the hold timer on top. */
export function SummaryCard({ data, paid = false, timer = null }) {
  return (
    <section
      aria-label="Booking summary"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_32px_-18px_rgba(23,26,24,0.28)]"
    >
      {timer ? (
        <div className="flex justify-center border-b border-border px-4 py-2.5">{timer}</div>
      ) : null}
      <StayPhoto photo={data.photo} title={data.title} sizes="380px" className="aspect-16/10" />
      <div className="space-y-5 p-5">
        <PropertyName data={data} />
        <div className="border-t border-border pt-5">
          <PriceDetails quote={data.quote} paid={paid} />
        </div>
        <div className="border-t border-border pt-4">
          <SecureNote />
        </div>
      </div>
    </section>
  );
}

export function Section({ icon: Icon, title, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-h4 text-ink-900">
          {Icon ? <Icon className="size-5 text-brand-700" aria-hidden="true" /> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One tile per visit. Only worth showing when there is more than one. */
export function VisitList({ quote }) {
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {quote.visits.map((visit) => {
          const tile = dayTile(visit.startsAt, quote.timeZone);
          return (
            <li
              key={visit.date}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <span className="grid w-14 shrink-0 rounded-lg bg-brand-50 py-1.5 text-center text-brand-800">
                <span className="text-[11px] font-semibold uppercase">{tile.weekday}</span>
                <span className="text-lg leading-tight font-bold">{tile.day}</span>
                <span className="text-[11px] font-semibold uppercase">{tile.month}</span>
              </span>
              <span className="min-w-0 text-sm">
                <span className="block font-semibold text-ink-900">
                  {clockTime(visit.startsAt, quote.timeZone)} –{' '}
                  {clockTime(visit.endsAt, quote.timeZone)}
                </span>
                <span className="block text-ink-600">
                  <span data-money>{money(visit.totalMinor)}</span> incl. fee
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-600">
        Each visit has its own arrival and departure. Time between visits is not included.
      </p>
    </>
  );
}

const REFUND_TONES = { full: 'bg-brand-600', partial: 'bg-brand-300', none: 'bg-ink-300' };

export function CancellationPolicy({ quote, now }) {
  const tier = CANCELLATION_TIERS[quote.policy.cancellationTier];
  const first = quote.visits[0];
  const steps = first ? cancellationSteps(quote.policy.cancellationTier, first.startsAt, now) : [];
  if (!tier) {
    return (
      <p className="text-sm text-ink-700">
        The host has not set a cancellation policy yet. Contact support before you book if you might
        need to cancel.
      </p>
    );
  }
  return (
    <div>
      <p className="text-sm text-ink-700">
        <span className="mr-2 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
          {tier.label}
        </span>
        {steps[0]?.rate > 0
          ? `Cancel before ${shortDay(steps[0].until, quote.timeZone)}, ${clockTime(steps[0].until, quote.timeZone)} for ${steps[0].rate === 1 ? 'a full' : `a ${Math.round(steps[0].rate * 100)}%`} rent refund.`
          : 'Cancelling now would not refund the rent.'}
      </p>
      <ol className="mt-4 grid gap-3 sm:auto-cols-fr sm:grid-flow-col sm:gap-2">
        {steps.map((step, index) => {
          const kind = step.rate === 1 ? 'full' : step.rate > 0 ? 'partial' : 'none';
          const last = index === steps.length - 1;
          return (
            <li key={step.until} className="flex gap-3 sm:block">
              <span
                aria-hidden="true"
                className={`w-1.5 shrink-0 rounded-full sm:mb-3 sm:block sm:h-1.5 sm:w-full ${REFUND_TONES[kind]}`}
              />
              <span className="block">
                <span className="block text-sm font-semibold text-ink-900">
                  {kind === 'full'
                    ? 'Full rent refund'
                    : kind === 'partial'
                      ? `${Math.round(step.rate * 100)}% rent refund`
                      : 'No refund'}
                </span>
                <span className="block text-xs text-ink-600">
                  {last
                    ? `Until arrival, ${shortDay(step.until, quote.timeZone)}`
                    : `Before ${shortDay(step.until, quote.timeZone)}, ${clockTime(step.until, quote.timeZone)}`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <ul className="mt-4 space-y-1.5 text-xs text-ink-600">
        {quote.visits.length > 1 ? (
          <li>Shown for your first visit. Each visit’s deadlines count from its own arrival.</li>
        ) : null}
        <li>No-show: no rent refund.</li>
        <li>
          The platform fee is refunded only with a full refund under a flexible policy. Cancel
          eligible visits from your booking.
        </li>
      </ul>
    </div>
  );
}

const RULE_ICONS = [
  [/smok|cigar|tobacco/i, CigaretteOff],
  [/music|noise|loud|speaker|\bdj\b/i, VolumeX],
  [/\bpets?\b|dog|cat|animal/i, PawPrint],
  [/pool|swim/i, Waves],
  [/alcohol|drink|liquor|beer/i, Wine],
  [/party|event|celebrat/i, PartyPopper],
  [/food|cater|cook|kitchen|meal/i, UtensilsCrossed],
  [/child|kid|infant|baby/i, Baby],
  [/time|hour|check-?in|check-?out|arriv|depart/i, Clock],
];
const ruleIcon = (rule) => RULE_ICONS.find(([pattern]) => pattern.test(rule))?.[1] ?? CircleCheck;

export function HouseRules({ rules }) {
  const list = Array.isArray(rules) ? rules.filter(Boolean) : [];
  if (!list.length)
    return <p className="text-sm text-ink-700">No house rules have been published.</p>;
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {list.map((rule) => {
        const Icon = ruleIcon(rule);
        return (
          <li
            key={rule}
            className="flex items-start gap-3 rounded-xl bg-ink-50 px-3 py-2.5 text-sm text-ink-800"
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
            {rule}
          </li>
        );
      })}
    </ul>
  );
}

export function TermsVersion({ quote }) {
  return (
    <details className="mt-4 text-xs text-ink-600">
      <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-semibold">
        <ScrollText className="size-3.5" aria-hidden="true" />
        Terms version
      </summary>
      <p className="mt-1">
        Policy {quote.policy.version} · listing terms {quote.policy.listingConfigVersion} · payment
        configuration {quote.payment.version}. No tax has been assumed.
      </p>
    </details>
  );
}

const BANNER_TONES = {
  brand: 'border-brand-200 bg-brand-50 text-brand-900 [&_svg]:text-brand-700',
  info: 'border-info/20 bg-info-bg text-ink-900 [&_svg]:text-info',
  warning: 'border-warning/25 bg-warning-bg text-ink-900 [&_svg]:text-warning',
  danger: 'border-danger/25 bg-danger-bg text-ink-900 [&_svg]:text-danger',
  neutral: 'border-border bg-card text-ink-900 [&_svg]:text-ink-600',
};

export function StatusBanner({ tone = 'neutral', icon: Icon, title, children, action }) {
  return (
    <div
      role="status"
      className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 sm:p-5 ${BANNER_TONES[tone]}`}
    >
      {Icon ? <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : null}
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-sm text-ink-700">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
