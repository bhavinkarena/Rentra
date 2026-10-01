import { CircleSlash, Clock, Layers, LayoutGrid, Sun, Users } from 'lucide-react';
import { ActivityIcon } from '@/components/rentra/icons/activity-icons';
import { calculateBookingPrice, CANCELLATION_TIERS_HOURLY, formatINR } from '@/lib/domain/pricing';
import { WEEKDAYS, weekdayKey } from '@/lib/domain/hourly';
import { clock12, unitName } from '@/lib/domain/vertical-ui';
import TimeSlotPicker from './TimeSlotPicker';
import QuoteSummary from './QuoteSummary';

/**
 * The venue half of the listing page (entertainment plan, Phase 8): time-booked
 * courts, lanes and stations. Server Components, like ListingSections. Free/busy
 * never comes from here — the cached page shows facts, the picker asks /times.
 */

const DAY_NAMES = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const INDOOR = { true: 'Indoor', false: 'Outdoor', mixed: 'Indoor and outdoor' };
/** "18:00" → "6 PM", "18:30" → "6:30 PM". */
const short = (hhmm) => clock12(hhmm).replace(':00 ', ' ');

/** "Court" or "Lane"… from the main activity, plural when needed. */
export function unitLabel(listing, count) {
  const unit = unitName(listing.activities?.[0]?.iconKey).toLowerCase();
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

const windowText = (w, compact = false) =>
  `${(compact ? short : clock12)(w.open)} – ${(compact ? short : clock12)(w.close)}${
    w.closesNextDay && !compact ? ' (next day)' : ''
  }`;

/** "Open today 6 AM – 1 AM", "Closed today", or null when hours are unknown. */
export function todayHours(openingHours, today) {
  if (!openingHours) return null;
  const windows = openingHours.weeklyHours?.[weekdayKey(today)] ?? [];
  return windows.length
    ? `Open today ${windows.map((w) => windowText(w, true)).join(', ')}`
    : 'Closed today';
}

/* ------------------------------------------------------------- chips */

export function ActivityChips({ activities = [] }) {
  if (!activities.length) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Activities">
      {activities.map((a) => (
        <li
          key={a.slug}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-meta font-medium text-ink-800"
        >
          <ActivityIcon iconKey={a.iconKey} className="size-4 text-brand-600" />
          {a.name}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- facts */

export function VenueFacts({ listing, today }) {
  const courts = listing.resources ?? [];
  const surfaces = [...new Set(courts.map((r) => r.details?.surface).filter(Boolean))];
  const facts = [
    courts.length ? { Icon: LayoutGrid, text: unitLabel(listing, courts.length) } : null,
    listing.maxPlayers ? { Icon: Users, text: `Up to ${listing.maxPlayers} players` } : null,
    INDOOR[listing.isIndoor] ? { Icon: Sun, text: INDOOR[listing.isIndoor] } : null,
    surfaces.length ? { Icon: Layers, text: surfaces.join(', ') } : null,
    todayHours(listing.openingHours, today)
      ? { Icon: Clock, text: todayHours(listing.openingHours, today) }
      : null,
  ].filter(Boolean);

  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-4 text-body text-ink-700">
      {facts.map(({ Icon, text }) => (
        <li key={text} className="inline-flex items-center gap-2">
          <Icon className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- courts */

export function CourtsList({ listing }) {
  const names = Object.fromEntries((listing.activities ?? []).map((a) => [a.slug, a]));
  const courts = listing.resources ?? [];
  if (!courts.length) return <p className="text-meta text-ink-500">No courts are listed yet.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {courts.map((court) => {
        const details = [
          court.details?.size,
          court.details?.surface,
          INDOOR[court.isIndoor] ?? null,
        ].filter(Boolean);
        return (
          <li key={court.id} className="rounded-lg border border-border bg-card p-4">
            <p className="text-h4 font-bold">{court.name}</p>
            {details.length ? (
              <p className="mt-1 text-meta text-ink-600">{details.join(' · ')}</p>
            ) : null}
            <p className="mt-0.5 text-meta text-ink-600">Up to {court.capacity} players</p>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-tiny font-medium text-brand-700">
              {(court.activities ?? []).map((slug) => (
                <li key={slug} className="inline-flex items-center gap-1.5">
                  <ActivityIcon iconKey={names[slug]?.iconKey} className="size-4" />
                  {names[slug]?.name ?? slug}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------- opening hours */

/** Consecutive days with the same hours share a row ("Monday – Friday"). */
export function OpeningHours({ openingHours, today }) {
  if (!openingHours)
    return <p className="text-meta text-ink-500">The venue is updating its booking times.</p>;
  const todayKey = weekdayKey(today);
  const rows = [];
  for (const day of WEEKDAYS) {
    const windows = openingHours.weeklyHours?.[day] ?? [];
    const text = windows.length ? windows.map((w) => windowText(w)).join(', ') : 'Closed';
    const last = rows.at(-1);
    if (last && last.text === text) last.days.push(day);
    else rows.push({ days: [day], text });
  }
  return (
    <table className="w-full max-w-xl text-body">
      <caption className="sr-only">Weekly opening hours</caption>
      <tbody>
        {rows.map((row) => {
          const isToday = row.days.includes(todayKey);
          const label =
            row.days.length === 1
              ? DAY_NAMES[row.days[0]]
              : `${DAY_NAMES[row.days[0]]} – ${DAY_NAMES[row.days.at(-1)]}`;
          return (
            <tr key={label} className={`border-b border-ink-100 ${isToday ? 'font-bold' : ''}`}>
              <th scope="row" className="py-2.5 pr-4 text-left font-[inherit]">
                {label}
                {isToday ? <span className="ml-1.5 text-meta text-brand-700">· Today</span> : null}
              </th>
              <td className="py-2.5 text-right tabular">{row.text}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------- prices */

/**
 * Per activity, weekday and weekend bands. A band priced above the cheapest one
 * of its day is peak: a dot AND the word, so colour is never the only signal.
 */
export function RateTable({ listing }) {
  const rates = listing.rates ?? [];
  const activities = (listing.activities ?? []).filter((a) =>
    rates.some((r) => r.activity === a.slug),
  );
  if (!activities.length)
    return <p className="text-meta text-ink-500">No hourly prices are listed yet.</p>;
  return (
    <div className="space-y-6">
      {activities.map((activity) => (
        <div key={activity.slug}>
          {activities.length > 1 ? (
            <h3 className="mb-3 flex items-center gap-2 text-h4 font-bold">
              <ActivityIcon iconKey={activity.iconKey} className="size-5 text-brand-600" />
              {activity.name}
            </h3>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['weekday', 'Monday – Friday'],
              ['weekend', 'Saturday and Sunday'],
            ].map(([kind, label]) => {
              const bands = rates.filter((r) => r.activity === activity.slug && r.dayKind === kind);
              const low = Math.min(...bands.map((b) => b.hourlyRate));
              return (
                <div key={kind} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-meta font-semibold text-ink-600">{label}</p>
                  {bands.length ? (
                    <dl className="mt-2 divide-y divide-ink-100 text-body">
                      {bands.map((b) => {
                        const peak = b.hourlyRate > low;
                        return (
                          <div key={b.from} className="flex justify-between gap-3 py-2">
                            <dt className="flex items-center gap-1.5">
                              {peak ? (
                                <span
                                  className="size-2 shrink-0 rounded-full bg-warning"
                                  aria-hidden="true"
                                />
                              ) : null}
                              {short(b.from)} – {short(b.to)}
                              {peak ? <span className="text-meta text-ink-600">· Peak</span> : null}
                            </dt>
                            <dd className="font-semibold tabular" data-money>
                              {formatINR(b.hourlyRate)} / hr
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : (
                    <p className="mt-2 text-meta text-ink-500">Not bookable</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-meta text-ink-600">
        Per hour, per {unitName(listing.activities?.[0]?.iconKey).toLowerCase()}. Platform fee added
        at checkout.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- rules */

const FOOTWEAR = {
  non_marking: 'Non-marking shoes only',
  no_studs: 'Sports shoes, no studs',
  studs_ok: 'Studs allowed',
  any: 'Any footwear',
};
const FOOD = {
  yes: 'Outside food allowed',
  no: 'No outside food',
  seating_only: 'Outside food in the seating area only',
};

export function VenueRules({ rules }) {
  const r = rules && !Array.isArray(rules) && typeof rules === 'object' ? rules : {};
  const lines = [
    FOOTWEAR[r.footwear] ?? null,
    r.minAge ? `Players ${r.minAge}+ only` : null,
    FOOD[r.foodAllowed] ?? null,
    r.smokingAllowed ? 'Smoking allowed in marked areas' : 'No smoking',
    r.alcoholAllowed ? 'Alcohol allowed' : 'No alcohol',
  ].filter(Boolean);
  return (
    <>
      <ul className="grid gap-2 text-body text-ink-700 sm:grid-cols-2">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {r.notes ? (
        <p className="mt-4 max-w-prose text-body whitespace-pre-line [overflow-wrap:anywhere] text-ink-700">
          {r.notes}
        </p>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------- cancellation */

/** The latest full-refund time for a Saturday 7 PM start, e.g. "Friday 7:00 PM". */
function deadline(hoursBefore) {
  const at = 5 * 24 + 19 - hoursBefore; // hours since Monday 00:00; Saturday is day 5
  const day = WEEKDAYS[Math.floor(at / 24)];
  return `${DAY_NAMES[day]} ${clock12(`${String(at % 24).padStart(2, '0')}:00`)}`;
}

const hours = (n) => `${n} hour${n === 1 ? '' : 's'}`;

/**
 * Hour bands with rupee amounts for a one-hour booking at the from-price. Same
 * rule as calculateRefund: the fee comes back only on a full flexible refund.
 */
export function VenueCancellation({ tier = 'moderate', rent }) {
  const policy = CANCELLATION_TIERS_HOURLY[tier] ?? CANCELLATION_TIERS_HOURLY.moderate;
  const { fee } = calculateBookingPrice({ baseRent: rent });
  const rows = policy.bands.map(([minHours, rate], i) => {
    const above = policy.bands[i - 1]?.[0];
    const label =
      i === 0
        ? `${hours(minHours)} or more before`
        : minHours === 0
          ? `Less than ${hours(above)} before`
          : `${minHours} to ${hours(above)} before`;
    const refund = Math.round(rent * rate) + (tier === 'flexible' && rate === 1 ? fee : 0);
    return { label, refund };
  });
  const [fullHours] = policy.bands.find(([, rate]) => rate === 1) ?? [];

  return (
    <div className="max-w-lg overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 bg-ink-50 px-4 py-3">
        <p className="text-meta font-bold">{policy.label} cancellation</p>
        <p className="text-tiny text-ink-500">1 hr example {formatINR(rent + fee)}</p>
      </div>
      <dl className="divide-y divide-border">
        {rows.map(({ label, refund }) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-meta text-ink-700">{label} the start</dt>
            <dd
              className={`text-meta font-bold tabular ${refund > 0 ? 'text-brand-700' : 'text-ink-500'}`}
              data-money
            >
              {formatINR(refund)} back
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="text-meta text-ink-700">No-show</dt>
          <dd className="text-meta font-bold text-ink-500 tabular" data-money>
            {formatINR(0)} back
          </dd>
        </div>
      </dl>
      {fullHours != null ? (
        <p className="flex items-start gap-2 border-t border-border bg-brand-50 px-4 py-3 text-tiny text-brand-800">
          <CircleSlash className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Example: for a Saturday 7:00 PM start, cancel by {deadline(fullHours)} for a full refund.
        </p>
      ) : null}
      <p className="border-t border-border px-4 py-3 text-tiny text-ink-500">
        Your booking review shows the exact cancellation deadline before payment.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- rail */

/** Activities a guest can actually book: a court offers them and they have a price. */
export function bookableActivities(listing) {
  return (listing.activities ?? []).filter(
    (a) =>
      (listing.rates ?? []).some((r) => r.activity === a.slug) &&
      (listing.resources ?? []).some((r) => r.activities?.includes(a.slug)),
  );
}

/**
 * The desktop rail: from-price, then the time picker and the quote (Phase 9).
 * Phones get the same picker in the bottom sheet (VenueMobileBar).
 */
export function VenueBookingRail({ listing, today }) {
  const activities = bookableActivities(listing);
  const open = listing.bookable && listing.openingHours && activities.length > 0;
  const courts = listing.resources?.length ?? 0;
  const status = todayHours(listing.openingHours, today);
  return (
    <section
      id="book"
      aria-labelledby="book-heading"
      className="scroll-mt-24 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <h2 id="book-heading" className="sr-only">
        Book a time
      </h2>
      <p className="flex items-baseline gap-1.5">
        {listing.price != null ? (
          <>
            <span className="text-tiny text-ink-600">From</span>
            <span className="text-h3 font-extrabold tracking-tight tabular" data-money>
              {formatINR(listing.price)}
            </span>
            <span className="text-meta text-ink-600">/ hr</span>
          </>
        ) : (
          <span className="text-h4 font-bold">Prices not listed yet</span>
        )}
      </p>
      <p className="mt-1 text-meta text-ink-600">
        {[courts ? unitLabel(listing, courts) : null, status].filter(Boolean).join(' · ')}
      </p>
      {open ? (
        <div className="mt-5 hidden lg:block">
          <TimeSlotPicker
            activities={activities}
            horizonDays={listing.openingHours.bookingHorizonDays}
          />
          <QuoteSummary compact />
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-ink-50 p-4 text-meta text-ink-700">
          The venue is updating its booking times. Hours and prices are on this page.
        </p>
      )}
    </section>
  );
}
