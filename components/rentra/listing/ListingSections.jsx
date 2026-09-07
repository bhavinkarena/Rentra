import {
  AirVent, Ban, BedDouble, Bath, CarFront, Check, ChevronDown, CircleSlash,
  Clock, Flame, Landmark, LandPlot, Lock, MapPin, Music, ShieldCheck, Sparkles,
  Trees, Users, Utensils, Waves, Wifi,
} from 'lucide-react';
import Rating from '@/components/rentra/Rating';
import TrustBadge from '@/components/rentra/TrustBadge';
import { CANCELLATION_TIERS, calculateRefund, formatINR } from '@/lib/domain/pricing';

/**
 * The read-only half of the listing page. Server Components, every one —
 * this is the content Google indexes and the content a guest reads before
 * they ever touch the calendar, so none of it may wait on hydration.
 */

/* ---------------------------------------------------------------- section */

export function Section({ id, title, intro, children, className = '' }) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={`scroll-mt-24 border-t border-border pt-8 ${className}`}
    >
      <h2 id={id ? `${id}-heading` : undefined} className="text-h2">{title}</h2>
      {intro ? <p className="mt-2 max-w-prose text-body text-ink-600">{intro}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------- key facts */

/**
 * Capacity & type. Deliberately the first thing under the title: "will we all
 * fit" is the question that decides whether the rest of the page matters.
 */
export function KeyFacts({ listing }) {
  const facts = [
    { Icon: Users, label: 'Guests', value: `Up to ${listing.capacity}` },
    listing.bedrooms
      ? { Icon: BedDouble, label: 'Bedrooms', value: String(listing.bedrooms) }
      : null,
    listing.farmSize
      ? {
        Icon: LandPlot,
        label: 'Farm size',
        value: `${trimNumber(listing.farmSize)} ${listing.farmSizeUnit}`,
      }
      : null,
    listing.poolSize
      ? { Icon: Waves, label: 'Private pool', value: `${listing.poolSize} ft` }
      : null,
  ].filter(Boolean);

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {facts.map(({ Icon, label, value }) => (
        <li key={label} className="rounded-md border border-border bg-card p-3.5">
          <Icon className="size-5 text-brand-600" aria-hidden="true" />
          <p className="mt-2 text-tiny font-bold tracking-wider text-ink-500 uppercase">
            {label}
          </p>
          <p className="mt-0.5 text-h4 font-bold tabular">{value}</p>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- amenities */

/**
 * Keyword → icon. Amenities are free-text labels on `rentable.amenities`
 * today, so this matches on words rather than on the fixed taxonomy's slugs.
 * An unmatched amenity gets a tick, never a wrong icon.
 */
const AMENITY_ICONS = [
  [/pool|rain dance/i, Waves],
  [/\bac\b|air.?con/i, AirVent],
  [/kitchen|dining|cook/i, Utensils],
  [/parking|car/i, CarFront],
  [/wifi|internet/i, Wifi],
  [/bonfire|barbe|bbq|fire/i, Flame],
  [/lawn|garden|orchard|tree|farm/i, Trees],
  [/music|dj|stage|speaker/i, Music],
  [/bath|washroom|toilet|shower/i, Bath],
  [/caretaker|staff|security|guard/i, ShieldCheck],
  [/clean|housekeep/i, Sparkles],
];

/**
 * Resolved into `{ label, Icon }` pairs before render rather than inside the
 * row component: picking a component out of a table during render makes its
 * identity change between renders, which React's lint rules rightly flag.
 */
const withIcons = (labels) =>
  labels.map((label) => ({
    label,
    Icon: AMENITY_ICONS.find(([re]) => re.test(label))?.[1] ?? Check,
  }));

/**
 * Grid of eight, then "show all". A <details> rather than a client component:
 * the hidden amenities stay in the HTML for crawlers, the toggle needs no
 * JavaScript, and it is keyboard-accessible for free.
 */
export function AmenityGrid({ amenities = [] }) {
  const shown = amenities.slice(0, 8);
  const hidden = amenities.slice(8);

  if (!amenities.length) {
    return <p className="text-meta text-ink-500">Amenities are being confirmed on the visit.</p>;
  }

  return (
    <>
      <AmenityList items={withIcons(shown)} />

      {hidden.length ? (
        <details className="group mt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-ink-300 bg-card px-4 py-2.5 text-meta font-semibold transition-colors hover:bg-ink-50">
            <span className="group-open:hidden">Show all {amenities.length} amenities</span>
            <span className="hidden group-open:inline">Show fewer</span>
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <AmenityList items={withIcons(hidden)} className="mt-4" />
        </details>
      ) : null}
    </>
  );
}

function AmenityList({ items, className = '' }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2.5 text-body">
          <item.Icon className="mt-0.5 size-4.5 shrink-0 text-brand-600" aria-hidden="true" />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ house rules */

export function HouseRules({ listing }) {
  const { houseRules = [], checkInFrom, checkOutBy } = listing;

  return (
    <>
      {checkInFrom || checkOutBy ? (
        <dl className="mb-5 grid gap-3 sm:grid-cols-2">
          {[
            ['Check-in', checkInFrom],
            ['Check-out', checkOutBy],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex items-center gap-2.5 rounded-md bg-brand-50 p-3.5">
              <Clock className="size-4.5 shrink-0 text-brand-700" aria-hidden="true" />
              <div>
                <dt className="text-tiny font-bold tracking-wider text-brand-700 uppercase">
                  {label}
                </dt>
                {/* A window, not a fixed time — that is the local convention. */}
                <dd className="text-meta font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      ) : null}

      <ul className="space-y-2.5">
        {houseRules.map((rule) => (
          <li key={rule} className="flex items-start gap-2.5 text-body text-ink-700">
            <Ban className="mt-1 size-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* --------------------------------------------------------- area location */

/**
 * An area circle, never an exact pin.
 *
 * This is the information release ladder rendered: a browsing visitor sees
 * roughly where the farm is, and the street address unlocks on confirmation.
 * It is drawn rather than fetched from a tile provider on purpose — a real
 * map here would either need a key and a third-party request on every listing
 * view, or would tempt someone into dropping the true coordinates into it.
 */
export function AreaCircle({ listing }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative h-56 bg-brand-50">
        <svg
          viewBox="0 0 400 224"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`Approximate location — ${listing.areaName}, ${listing.cityName}`}
        >
          <defs>
            <pattern id="lanes" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 40 H40 M40 0 V40" fill="none" stroke="#DDEBE2" strokeWidth="2" />
            </pattern>
            <radialGradient id="fade" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="#2E6449" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#2E6449" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="400" height="224" fill="url(#lanes)" />
          {/* A wider road through, so the panel reads as a place, not a texture. */}
          <path d="M-10 150 Q 140 120 200 96 T 410 70" fill="none" stroke="#BCD8C7" strokeWidth="7" />
          <circle cx="200" cy="112" r="96" fill="url(#fade)" />
          <circle
            cx="200" cy="112" r="72"
            fill="#2E6449" fillOpacity="0.1"
            stroke="#2E6449" strokeWidth="2" strokeDasharray="7 6"
          />
          <circle cx="200" cy="112" r="5" fill="#2E6449" />
        </svg>

        <p className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-card/95 px-3.5 py-1.5 text-meta font-bold shadow-sm backdrop-blur">
          <MapPin className="mr-1 inline size-3.5 text-brand-600" aria-hidden="true" />
          {listing.areaName}, {listing.cityName}
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-4">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden="true" />
        <p className="text-meta text-ink-600">
          This circle is the area, not the address. The exact address, map
          directions and the owner&rsquo;s number are released the moment your
          booking is confirmed.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- reviews */

const SUB_SCORES = [
  ['cleanliness', 'Cleanliness'],
  ['accuracy', 'Matches the photos'],
  ['valueForMoney', 'Value for money'],
];

export function Reviews({ listing }) {
  const { reviews = [], subScores, rating, reviewCount } = listing;

  if (!reviewCount || !reviews.length) {
    return (
      <p className="text-meta text-ink-500">
        No reviews yet. This farm has been visited and photographed by Rentra,
        but nobody has stayed through us here so far.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
        <div>
          <p className="flex items-baseline gap-1.5">
            <span className="text-display tabular">{rating.toFixed(1)}</span>
            <span className="text-body text-ink-500">/ 5</span>
          </p>
          <p className="mt-1 text-meta text-ink-600">
            {reviewCount} {reviewCount === 1 ? 'stay' : 'stays'}
          </p>
        </div>

        {subScores ? (
          <dl className="grid content-center gap-2.5">
            {SUB_SCORES.map(([key, label]) => {
              const value = subScores[key];
              if (value == null) return null;
              return (
                <div key={key} className="flex items-center gap-3">
                  <dt className="w-40 shrink-0 text-meta text-ink-600">{label}</dt>
                  <dd className="flex flex-1 items-center gap-2.5">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <span
                        className="block h-full rounded-full bg-brand-600"
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </span>
                    <span className="w-7 text-right text-meta font-bold tabular">
                      {value.toFixed(1)}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
      </div>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {reviews.slice(0, 6).map((r) => (
          <li key={r.id} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-meta font-bold">{r.authorName}</p>
              <Rating value={r.rating} count={1} className="shrink-0" />
            </div>
            <p className="mt-0.5 text-tiny text-ink-500">
              {r.publishedAt
                ? new Date(r.publishedAt).toLocaleDateString('en-IN', {
                  month: 'long', year: 'numeric',
                })
                : null}
            </p>
            {r.body ? <p className="mt-2.5 text-body text-ink-700">{r.body}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ----------------------------------------------------------- owner card */

/**
 * Owner card. First name, badge, response time — and no phone number.
 *
 * The masked row is not a UI flourish: the digits are never selected from the
 * database for a public page, so there is nothing here to leak even if this
 * markup is wrong.
 */
export function OwnerCard({ listing }) {
  const { client, verifiedAt } = listing;
  const minutes = client?.respondsWithinMins;
  const rate = client?.responseRate;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-h4 font-extrabold text-brand-700"
        >
          {client?.firstName?.[0] ?? 'O'}
        </span>
        <div className="min-w-0">
          <p className="text-h4 font-bold">{client?.firstName}</p>
          <p className="text-meta text-ink-600">
            {listing.categoryName ?? 'Farmhouse'} owner
            {client?.since
              ? ` · on Rentra since ${new Date(client.since).getFullYear()}`
              : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TrustBadge variant={verifiedAt ? 'verified' : 'owner'} />
        {minutes != null && minutes <= 120 ? <TrustBadge variant="fast" /> : null}
      </div>

      <dl className="mt-4 space-y-2.5 text-meta">
        {minutes != null ? (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-600">Typically replies in</dt>
            <dd className="font-semibold tabular">{formatMinutes(minutes)}</dd>
          </div>
        ) : null}
        {rate != null ? (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-600">Response rate</dt>
            <dd className="font-semibold tabular">{Math.round(rate * 100)}%</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <dt className="text-ink-600">Phone number</dt>
          <dd className="flex items-center gap-1.5 font-semibold text-ink-400">
            <Lock className="size-3.5" aria-hidden="true" />
            <span aria-hidden="true" className="tabular">+91 •••• •••• </span>
            <span className="sr-only">Hidden until your booking is confirmed</span>
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-tiny text-ink-500">
        Ask the owner anything through Rentra. Numbers and the address unlock
        on confirmation — that is what keeps the booking, and your money,
        covered by us.
      </p>
    </div>
  );
}

/* ------------------------------------------------------- cancellation */

const BAND_LABELS = ['7 days or more before', '3 to 6 days before', 'Less than 3 days before'];

/**
 * The refund in rupees, not in percentages.
 *
 * Computed with the same `calculateRefund` the webhook and the worker use, so
 * what a guest is promised here is arithmetically the same thing they will be
 * paid. A percentage table that disagrees with the money by ₹40 is how a
 * support queue starts.
 */
export function CancellationPolicy({ tier = 'moderate', rent, fee, deposit = 0 }) {
  const policy = CANCELLATION_TIERS[tier] ?? CANCELLATION_TIERS.moderate;

  const rows = policy.bands.map(([minDays], i) => {
    // A day count comfortably inside each band, so the band being described
    // is the band being computed.
    const daysUntilCheckIn = i === 0 ? minDays + 3 : minDays + 1;
    const r = calculateRefund({ tier, daysUntilCheckIn, rent, fee, deposit: 0 });
    return { label: BAND_LABELS[i] ?? `${minDays}+ days before`, refund: r.refund };
  });

  return (
    <div className="max-w-lg overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 bg-ink-50 px-4 py-3">
        <p className="text-meta font-bold">{policy.label} cancellation</p>
        {/* Rent + fee, because on the flexible tier the fee comes back too —
            quoting the rent alone would show a refund larger than the base. */}
        <p className="text-tiny text-ink-500">
          on the {formatINR(rent + fee)} you pay
        </p>
      </div>
      <dl className="divide-y divide-border">
        {rows.map(({ label, refund }) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-meta text-ink-700">{label}</dt>
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
      {deposit > 0 ? (
        <p className="flex items-start gap-2 border-t border-border bg-brand-50 px-4 py-3 text-tiny text-brand-800">
          <CircleSlash className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          The {formatINR(deposit)} security deposit is always returned in full.
          It is not a penalty instrument.
        </p>
      ) : null}
      <p className="border-t border-border px-4 py-3 text-tiny text-ink-500">
        If the owner cancels a confirmed booking, you are refunded in full —
        rent, fee and deposit — automatically.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ money note */

/**
 * Container queries, not viewport ones: this renders both full-width under
 * the content column and inside the 360px booking rail, and three columns in
 * 360px turns every line into two words.
 */
export function MoneyNote() {
  return (
    <ul className="@container grid gap-4 rounded-lg bg-brand-50 p-5 @lg:grid-cols-3">
      {[
        [Landmark, 'Money held until check-in', 'Your payment stays with Rentra. The owner is paid after you have arrived.'],
        [ShieldCheck, 'Verified in person', 'Someone from Rentra has stood on this property and taken these photos.'],
        [CircleSlash, 'Brokerage ₹0', 'You book the owner directly. No dalal, no hidden commission.'],
      ].map(([Icon, title, body]) => (
        <li key={title} className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-4.5 shrink-0 text-brand-700" aria-hidden="true" />
          <div>
            <p className="text-meta font-bold text-brand-900">{title}</p>
            <p className="mt-0.5 text-tiny leading-relaxed text-brand-800">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- utils */

const trimNumber = (n) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

function formatMinutes(mins) {
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} hr` : `${Math.round(hours / 24)} days`;
}
