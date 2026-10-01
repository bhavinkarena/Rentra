import Link from '@/components/navigation/NavigationLink';
import { operatingWindows } from '@/lib/domain/hourly';
import { addLocalDays, formatLocalDate, propertyToday } from '@/lib/domain/booking-dates';

const STEP = 30;
const PX_PER_STEP = 28; // a 6 AM–11 PM day fits a 1440 screen without scrolling
const midnight = (date) => Date.parse(`${date}T00:00:00+05:30`);
const minuteOf = (iso, date) => Math.round((Date.parse(iso) - midnight(date)) / 60000);
const clock = (date, minute) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(midnight(date) + minute * 60000));
const span = (date, start, end) =>
  `${clock(date, start)} – ${clock(date, end)}${end > 1440 ? ' (next day)' : ''}`;

const KIND = {
  booking: { label: 'Booking', tone: 'border-brand-700 bg-brand-600 text-white' },
  held: {
    label: 'Temporary hold',
    tone: 'border-warning bg-warning-bg text-warning bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(0_0_0/0.06)_6px_12px)]',
  },
  owner_block: { label: 'Blocked', tone: 'border-dashed border-ink-500 bg-secondary text-ink-700' },
};
const kindOf = (r) =>
  r.source === 'owner_block' ? 'owner_block' : r.state === 'held' ? 'held' : 'booking';

/**
 * One venue's day, court by court (entertainment plan, Phases 5 and 9). Rows are
 * courts; a venue-wide block gets its own row. Columns are 30 minutes across the
 * opening hours, widened to fit anything booked outside them. Bookings are solid,
 * holds striped, blocks dashed; buffers show as a light extension. Phones get the
 * same items as a time-sorted list.
 *
 * ponytail: no drag-to-select an empty range into the block form; add when owners ask.
 */
export default function ResourceDayTimeline({ property, config, date, basePath }) {
  const items = (property?.intervals ?? [])
    .map((r) => ({
      ...r,
      kind: kindOf(r),
      start: minuteOf(r.starts_at ?? r.blocked_start_at, date),
      end: minuteOf(r.ends_at ?? r.blocked_end_at, date),
      blockedStart: minuteOf(r.blocked_start_at, date),
      blockedEnd: minuteOf(r.blocked_end_at, date),
    }))
    // Operating day D: anything that touches [00:00 D, 06:00 D+1).
    .filter((r) => r.blockedEnd > 0 && r.blockedStart < 1800)
    .sort((a, b) => a.blockedStart - b.blockedStart);
  const windows = config?.model === 'hourly' ? operatingWindows(config, date) : [];
  const edges = [
    ...windows.flatMap((w) => [w.startMin, w.endMin]),
    ...items.flatMap((r) => [r.blockedStart, r.blockedEnd]),
  ];
  const from = Math.max(
    0,
    Math.floor(Math.min(...edges, windows.length ? Infinity : 360) / STEP) * STEP,
  );
  const to = Math.min(
    1800,
    Math.ceil(Math.max(...edges, windows.length ? -Infinity : 1380) / STEP) * STEP,
  );
  const total = Math.max(to - from, STEP);
  const pct = (minute) => `${((Math.min(Math.max(minute, from), to) - from) / total) * 100}%`;
  const width = (start, end) => `${((Math.min(end, to) - Math.max(start, from)) / total) * 100}%`;

  const courts = (property?.resources ?? []).filter(
    (c) => c.isActive || items.some((r) => r.resource_id === c.id),
  );
  const rows = [
    ...(items.some((r) => !r.resource_id) ? [{ id: null, name: 'Whole venue' }] : []),
    ...courts,
  ];
  const hours = [];
  for (let m = Math.ceil(from / 60) * 60; m < to; m += 60) hours.push(m);
  const today = propertyToday();
  const day = (d) => `${basePath}?${new URLSearchParams({ date: d })}`;
  const label = (r) =>
    [
      r.resource_name ?? 'Whole venue',
      span(date, r.start, r.end),
      KIND[r.kind].label,
      r.activity,
      r.reference,
      r.guests ? `${r.guests} players` : null,
      r.reason,
    ]
      .filter(Boolean)
      .join(', ');

  const item = (r, className = '', style) => {
    const body = (
      <>
        <span className="block truncate font-semibold">{span(date, r.start, r.end)}</span>
        <span className="block truncate">{r.reference ?? r.reason ?? KIND[r.kind].label}</span>
      </>
    );
    const cls = `rounded-md border px-2 py-1 text-tiny ${KIND[r.kind].tone} ${className}`;
    return r.order_id ? (
      <Link
        href={`/partner/bookings/${r.order_id}`}
        aria-label={label(r)}
        className={cls}
        style={style}
      >
        {body}
      </Link>
    ) : (
      <span role="img" aria-label={label(r)} className={cls} style={style}>
        {body}
      </span>
    );
  };

  return (
    <section className="space-y-4" aria-labelledby="timeline-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="timeline-heading" className="text-h3">
          {formatLocalDate(date, { weekday: 'long' })}
        </h2>
        <nav aria-label="Choose a day" className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-meta"
            href={day(addLocalDays(date, -1))}
          >
            Previous day
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-meta"
            href={day(today)}
            aria-current={date === today ? 'date' : undefined}
          >
            Today
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-meta"
            href={day(addLocalDays(date, 1))}
          >
            Next day
          </Link>
        </nav>
      </div>
      <p className="text-meta text-ink-600">
        {windows.length
          ? `Open ${windows.map((w) => span(date, w.startMin, w.endMin)).join(' and ')}. India time.`
          : 'Closed on this day by the weekly hours. India time.'}{' '}
        Solid: booking · Striped: temporary hold · Dashed: blocked · Pale edge: changeover buffer.
      </p>

      {!rows.length ? (
        <p className="rounded-md border border-dashed border-border p-4 text-meta">
          No courts yet. Add courts on the property page.
        </p>
      ) : (
        <>
          <div
            className="hidden overflow-x-auto rounded-lg border border-border md:block"
            role="region"
            aria-label="Court timeline"
            tabIndex={0}
          >
            <div style={{ minWidth: `calc(9rem + ${(total / STEP) * PX_PER_STEP}px)` }}>
              <div className="flex border-b border-border text-tiny text-ink-500">
                <div className="sticky left-0 z-10 w-36 shrink-0 bg-card px-3 py-2">Court</div>
                <div className="relative h-8 flex-1">
                  {hours.map((m) => (
                    <span
                      key={m}
                      className="absolute top-2 border-l border-border pl-1 tabular"
                      style={{ left: pct(m) }}
                    >
                      {clock(date, m)}
                    </span>
                  ))}
                </div>
              </div>
              <ul>
                {rows.map((row) => {
                  const own = items.filter((r) => (r.resource_id ?? null) === row.id);
                  return (
                    <li
                      key={row.id ?? 'venue'}
                      className="flex border-b border-border last:border-b-0"
                    >
                      <div className="sticky left-0 z-10 flex w-36 shrink-0 items-center bg-card px-3 text-meta font-semibold">
                        {row.name}
                        {row.id && row.isActive === false ? (
                          <span className="ml-1 font-normal text-ink-500">(removed)</span>
                        ) : null}
                      </div>
                      <div
                        className="relative h-16 flex-1"
                        style={{
                          backgroundImage: `repeating-linear-gradient(90deg, var(--color-border) 0 1px, transparent 1px ${100 / (total / STEP)}%)`,
                        }}
                      >
                        {windows.length === 0 ? null : (
                          <>
                            {[{ startMin: from, endMin: from }, ...windows].map((w, i, all) => {
                              const next = all[i + 1]?.startMin ?? to;
                              return w.endMin < next ? (
                                <span
                                  key={i}
                                  aria-hidden="true"
                                  className="absolute inset-y-0 bg-ink-50"
                                  style={{ left: pct(w.endMin), width: width(w.endMin, next) }}
                                />
                              ) : null;
                            })}
                          </>
                        )}
                        {own.map((r) => (
                          <span key={r.id}>
                            {r.blockedStart < r.start || r.blockedEnd > r.end ? (
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-2 rounded-md bg-brand-100"
                                style={{
                                  left: pct(r.blockedStart),
                                  width: width(r.blockedStart, r.blockedEnd),
                                }}
                              />
                            ) : null}
                            {item(r, 'absolute inset-y-2 overflow-hidden', {
                              left: pct(r.start),
                              width: width(r.start, r.end),
                            })}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <ul className="space-y-2 md:hidden" aria-label="Bookings and blocks on this day">
            {items.length ? (
              items.map((r) => (
                <li key={r.id} className="space-y-1">
                  <p className="text-tiny font-semibold text-ink-700">
                    {r.resource_name ?? 'Whole venue'}
                  </p>
                  {item(r, 'block min-h-11')}
                </li>
              ))
            ) : (
              <li className="rounded-md border border-dashed border-border p-4 text-meta">
                Nothing booked or blocked on this day.
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
