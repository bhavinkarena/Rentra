'use client';
import { requestPortalLeave } from '@/components/portal/UnsavedChangesGuard';
import { EmptyState } from '@/components/ui/empty-state';
import Skeleton from '@/components/ui/skeleton';
import { fieldClass } from '@/components/ui/field';
import { OfflineBooking } from './CalendarTools';
import { displayMoney as money } from '@/lib/domain/display-money';
import { EARNINGS_NOTICE } from '@/lib/domain/owner-earnings';
import { ActionForm } from './listing/BookingCalendarSettings';
import { blockDates, unblockDates } from '@/lib/actions/partner';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import {
  ArrowRight,
  Ban,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  ExternalLink,
  Lock,
  LogIn,
  LogOut,
  MessageCircle,
  Moon,
  Phone,
  Sun,
  Tag,
  Timer,
  X,
} from 'lucide-react';
import { addLocalDays, propertyToday } from '@/lib/domain/booking-dates';
import {
  loadCalendarDay,
  changeCalendarSelection,
  undoCalendarChange,
} from '@/lib/actions/partner';

/** [label, icon, lane classes, legend swatch]. Colour always travels with a label. */
const states = {
  open: ['Open', Tag, 'text-ink-900', 'bg-card ring-1 ring-ink-300'],
  booked: ['Booked', CalendarCheck, 'bg-success text-white font-semibold', 'bg-success'],
  hold: [
    'Hold',
    Timer,
    'bg-warning-bg text-warning outline-1 -outline-offset-1 outline-dashed outline-warning/50',
    'bg-warning',
  ],
  blocked: [
    'Blocked',
    Lock,
    'bg-[repeating-linear-gradient(135deg,var(--color-ink-100)_0_5px,var(--color-ink-50)_5px_10px)] text-ink-700',
    'bg-[repeating-linear-gradient(135deg,var(--color-ink-300)_0_3px,var(--color-ink-100)_3px_6px)]',
  ],
  closed: ['Closed', Ban, 'text-ink-400', 'bg-ink-200'],
  too_soon: ['Too soon', Clock, 'text-ink-500', 'bg-ink-200'],
  beyond: ['Not open yet', Clock, 'text-ink-500', 'bg-ink-200'],
  past: ['Past', Clock, 'text-ink-400', 'bg-ink-100'],
  problem: [
    'Needs attention',
    CircleAlert,
    'bg-danger-bg text-danger font-semibold ring-1 ring-danger/30 ring-inset',
    'bg-danger',
  ],
};
const LEGEND = ['open', 'booked', 'hold', 'blocked', 'closed', 'problem'];
const VIEWS = [
  ['month', 'Month'],
  ['week', 'Week'],
  ['multi', '30 days'],
  ['agenda', 'Agenda'],
];
const time = (iso) =>
  new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
const dateTime = (iso) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
const dayKey = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
/** Phone mini-month dots: colour plus a spoken summary. */
const dots = [
  ['booked', 'bg-success', 'booked'],
  ['hold', 'bg-warning', 'on hold'],
  ['closed', 'bg-ink-400', 'closed'],
  ['override', 'bg-event-adjustment', 'custom price'],
];
const label = (s) => ({ day: 'Day picnic', night: 'Night stay', full_day: 'Full day' })[s] || s;
const short = (s) => ({ day: 'Day', night: 'Night', full_day: 'Full day' })[s] || s;
const dayText = (date) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(date + 'T00:00:00Z'));
const longDay = (date) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(date + 'T00:00:00Z'));
const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const btn = {
  base: 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 text-meta font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-brand-900',
  outline: 'border border-border bg-card text-ink-800 hover:border-brand-300 hover:bg-brand-50',
  ghost: 'text-ink-700 hover:bg-ink-100',
};
const button = (kind = 'outline') => `${btn.base} ${btn[kind]}`;
const segment = (on) =>
  `inline-flex h-full min-w-11 items-center justify-center rounded-[9px] px-3 text-meta font-semibold whitespace-nowrap transition-colors ${on ? 'bg-card text-ink-900 shadow-sm ring-1 ring-border' : 'text-ink-600 hover:text-ink-900'}`;

function Hold({ expires, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expires) - Date.now()));
  useEffect(() => {
    const timer = setInterval(() => {
      const n = Math.max(0, new Date(expires) - Date.now());
      setLeft(n);
      if (n === 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expires, onExpire]);
  return <span>Hold {Math.ceil(left / 60000)}m</span>;
}

function StateBadge({ state }) {
  const [text, , , swatch] = states[state] || states.closed;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-0.5 text-tiny font-semibold text-ink-800 ring-1 ring-border ring-inset">
      <span className={`size-2 rounded-full ${swatch}`} aria-hidden="true" />
      {text}
    </span>
  );
}

function Disclosure({ title, hint, children }) {
  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-meta font-semibold text-ink-900">{title}</span>
          {hint ? <span className="block text-tiny text-ink-500">{hint}</span> : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-ink-500 transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}

export default function PortfolioCalendar({
  data,
  basePath = '/partner/calendar',
  view = 'month',
  listHref,
  listFilters = {},
  anchor = propertyToday(),
}) {
  const detailHeading = useId();
  const router = useRouter(),
    dialog = useRef(null),
    drag = useRef(null);
  const [selected, setSelected] = useState([]),
    [opened, setOpened] = useState(null),
    [detail, setDetail] = useState(null),
    [result, setResult] = useState({}),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState('slots'),
    [slots, setSlots] = useState(['day']),
    [price, setPrice] = useState(''),
    [percent, setPercent] = useState(false);
  const today = propertyToday();
  const monthMove = (n) => {
    const d = new Date(anchor + 'T00:00:00Z');
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
  };
  useEffect(() => {
    if (!result.undoUntil) return;
    const timer = setTimeout(
      () => setResult((r) => ({ ...r, undoToken: null })),
      Math.max(0, result.undoUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [result.undoUntil]);
  const days = Array.from({ length: data.days }, (_, i) => addLocalDays(data.from, i));
  const href = (changes) =>
    `${basePath}?${new URLSearchParams({ from: anchor, view, slot: data.slot || '', ...(data.property ? { property: data.property } : {}), ...(listHref ? { fromList: listHref } : {}), ...listFilters, ...changes })}`;
  const toggle = (id, date) =>
    setSelected((rows) =>
      rows.some((r) => r.id === id && r.date === date)
        ? rows.filter((r) => r.id !== id || r.date !== date)
        : [...rows, { id, date }],
    );
  async function open(property, date) {
    setOpened({ property, date });
    setDetail(null);
    setResult({});
    dialog.current?.showModal();
    const next = await loadCalendarDay(property.id, date);
    setDetail(next);
  }
  const refresh = useCallback(() => router.refresh(), [router]);
  const close = () => {
    if (!requestPortalLeave()) return;
    dialog.current?.close();
    setOpened(null);
    setSelected([]);
    setResult({});
  };
  async function save(openValue, confirm = false, reset = false, align = false) {
    const rows = selected.length ? selected : [{ id: opened.property.id, date: opened.date }];
    if (new Set(rows.map((r) => r.id)).size !== 1) {
      setResult({ error: 'Choose dates in one property to apply changes together.' });
      return;
    }
    const property = data.items.find((p) => p.id === rows[0].id),
      cells = rows.flatMap((r) => slots.map((slot) => ({ date: r.date, slot })));
    const change = {
      cells,
      command: kind,
      ...(kind === 'slots'
        ? { open: openValue }
        : reset
          ? { reset: true }
          : percent
            ? { deltaBps: Math.round(Number(price) * 100) }
            : { rentMinor: Math.round(Number(price.replace(/[₹,\s]/g, '')) * 100) }),
      ...(align && { alignFullDay: true }),
    };
    const form = new FormData();
    Object.entries({
      rentableId: property.id,
      kind,
      change: JSON.stringify(change),
      expectedCalendarVersion: detail?.version || property.version,
      mode: confirm ? 'confirm' : 'preview',
      previewToken: result.preview?.token || '',
    }).forEach(([k, v]) => form.set(k, v));
    setBusy(true);
    try {
      const next = await changeCalendarSelection({}, form);
      setResult({ ...next, propertyId: property.id });
      if (next.ok) {
        setSelected([]);
        router.refresh();
        if (opened) setDetail(await loadCalendarDay(property.id, opened.date));
      }
    } catch {
      setResult({ error: 'Could not update these dates. Try again.' });
    } finally {
      setBusy(false);
    }
  }
  // CAL-03: an exact block starts from the first chosen slot's own hours.
  const blockSchedule = detail?.cells?.find((c) => c.slot === slots[0])?.schedule;
  const affected = result.preview?.result?.affected || result.preview?.affected || [];

  const commands = (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="What to change"
        className="flex h-11 w-full items-center gap-0.5 rounded-md border border-border bg-ink-25 p-1 sm:inline-flex sm:w-auto"
      >
        {[
          ['slots', 'Open or close'],
          ['prices', 'Set price'],
        ].map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            disabled={busy}
            onClick={() => {
              setKind(value);
              setResult({});
            }}
            className={`${segment(kind === value)} flex-1`}
          >
            {text}
          </button>
        ))}
      </div>
      <fieldset>
        <legend className="mb-2 text-tiny font-semibold text-ink-600">Slots</legend>
        <div className="flex flex-wrap gap-2">
          {['day', 'night', 'full_day'].map((s) => (
            <label
              key={s}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 text-meta font-semibold text-ink-700 transition-colors hover:border-brand-300 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-800 has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={slots.includes(s)}
                onChange={(e) => {
                  const next = e.target.checked ? [...slots, s] : slots.filter((x) => x !== s);
                  if (next.length) setSlots(next);
                  setResult({});
                }}
              />
              {label(s)}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === 'prices' && (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1.5 block text-tiny font-semibold text-ink-600">
              {percent ? 'Change from base price' : 'New price for each slot'}
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-meta text-ink-500">
                {percent ? '%' : '₹'}
              </span>
              <input
                className={`${fieldClass} pl-8 tabular`}
                inputMode="decimal"
                placeholder={percent ? 'e.g. 15 or -10' : 'e.g. 12000'}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setResult({});
                }}
              />
            </span>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-meta text-ink-700">
            <input
              type="checkbox"
              checked={percent}
              onChange={(e) => setPercent(e.target.checked)}
            />
            Use a percentage of the base price
          </label>
        </div>
      )}
      {!result.preview && (
        <div className="flex flex-wrap gap-2">
          {kind === 'slots' ? (
            <>
              <button className={button('primary')} disabled={busy} onClick={() => save(true)}>
                Open slots
              </button>
              <button className={button()} disabled={busy} onClick={() => save(false)}>
                Close slots
              </button>
            </>
          ) : (
            <>
              <button
                className={button('primary')}
                disabled={busy || !price.trim()}
                onClick={() => save(false)}
              >
                Preview price
              </button>
              <button
                className={button('ghost')}
                disabled={busy}
                onClick={() => save(false, false, true)}
              >
                Reset to base price
              </button>
            </>
          )}
        </div>
      )}
      {result.preview && (
        <section
          aria-label="Review changes"
          className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/50 p-4"
        >
          <p className="text-meta font-semibold text-ink-900">
            Review {affected.length} {affected.length === 1 ? 'change' : 'changes'}
          </p>
          <ul className="max-h-48 divide-y divide-border overflow-auto rounded-md border border-border bg-card text-meta">
            {affected.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-ink-700">
                  {dayText(c.date)} · {short(c.slot)}
                </span>
                <span className="flex items-center gap-1.5 tabular">
                  <span className="text-ink-500 line-through decoration-ink-300">
                    {kind === 'prices' ? money(c.before) : c.before ? 'Open' : 'Closed'}
                  </span>
                  <ArrowRight className="size-3.5 text-ink-400" aria-hidden="true" />
                  <span className="font-semibold text-ink-900">
                    {kind === 'prices' ? money(c.after) : c.after ? 'Open' : 'Closed'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {result.preview.result?.warnings?.map((w) => (
            <p key={w} className="flex gap-2 text-meta text-warning">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {w}
            </p>
          ))}
          {result.preview.result?.warnings?.length > 0 && (
            <button
              className={button()}
              disabled={busy}
              onClick={() => save(false, false, false, true)}
            >
              Update Full day to Day + Night
            </button>
          )}
          {result.preview.result?.conflicts?.map((c) => (
            <p key={c.date + c.slot} className="text-meta text-danger">
              {dayText(c.date)} · {label(c.slot)} is reserved.
              {c.reservations.map((r) =>
                r.orderId ? (
                  <Link
                    key={r.id}
                    className="ml-2 font-semibold underline"
                    href={`/partner/bookings/${r.orderId}`}
                  >
                    Open booking
                  </Link>
                ) : null,
              )}
            </p>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              className={button('primary')}
              disabled={busy || !!result.preview.result?.conflicts?.length}
              onClick={() => {
                const change = JSON.parse(result.preview.values.change);
                save(change.open, true, change.reset, change.alignFullDay);
              }}
            >
              Confirm changes
            </button>
            <button className={button('ghost')} onClick={() => setResult({})}>
              Cancel
            </button>
          </div>
        </section>
      )}
      {result.error && (
        <p
          role="alert"
          className="flex gap-2 rounded-md border border-danger/30 bg-danger-bg p-3 text-meta text-ink-900"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          {result.error}
        </p>
      )}
      {result.ok && !result.undoToken && (
        <p role="status" className="text-meta font-semibold text-success">
          Changes saved.
        </p>
      )}
      {result.undoToken && (
        <p
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-ink-25 p-3 text-meta"
        >
          <span className="font-semibold text-success">Changes saved.</span>
          <button
            className={button('ghost')}
            onClick={async () => {
              const next = await undoCalendarChange(result.propertyId, result.undoToken);
              setResult(next);
              router.refresh();
            }}
          >
            Undo (10 seconds)
          </button>
        </p>
      )}
    </div>
  );

  const periodTitle =
    view === 'month'
      ? new Intl.DateTimeFormat('en-IN', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(anchor + 'T00:00:00Z'))
      : `${dayText(data.from)} – ${dayText(days.at(-1))}`;

  function lanes(property, day, column) {
    if (property.rentalUnit === 'hour')
      return (
        <span className="mt-1.5 block rounded-md bg-ink-50 px-1.5 py-1 text-tiny text-ink-700">
          {property.intervals.filter((r) => r.starts_at?.slice(0, 10) === day).length} visits ·
          Courts
        </span>
      );
    // Past dates stay quiet: nothing on them can change any more.
    if (day < today) return null;
    return ['day', 'night'].map((s) => {
      const c = property.cells?.find((x) => x.date === day && x.slot === s),
        state = c?.state || 'closed',
        [text, , tone] = states[state];
      const own = property.intervals.filter((r) => c?.intervals?.includes(r.id));
      const visit = own.find((r) => r.source === 'booking' || r.kind);
      const hold = own.find((r) => r.state === 'held');
      // A stay ending this morning: its departure shows on the day lane.
      const leaving =
        s === 'day' &&
        property.intervals.find((r) => r.departure_day === day && r.arrival_day < day);
      const arriving = visit?.arrival_day === day;
      const overnight = state === 'booked' && visit?.departure_day > day;
      const Slot = s === 'day' ? Sun : Moon;
      return (
        <span
          key={s}
          data-state={state}
          data-continues={overnight || undefined}
          className={`mt-1 flex min-h-7 items-center gap-1 rounded-md px-1.5 text-tiny leading-tight ${tone} ${overnight && view !== 'agenda' && column !== 6 ? 'md:-mr-2 md:rounded-r-none' : ''}`}
        >
          {state === 'booked' && arriving ? (
            <LogIn className="size-3 shrink-0" aria-hidden="true" />
          ) : (
            <Slot className="size-3 shrink-0 opacity-60" aria-hidden="true" />
          )}
          <span className="min-w-0 truncate">
            {view === 'agenda' ? (
              <span className="opacity-70">{label(s)} · </span>
            ) : (
              <span className="sr-only">{label(s)}: </span>
            )}
            {state === 'open' ? (
              <span className="font-semibold tabular">{money(c.effectivePriceMinor)}</span>
            ) : state === 'hold' && hold ? (
              <Hold expires={hold.hold_expires_at} onExpire={refresh} />
            ) : state === 'booked' && visit ? (
              `${visit.guest_name?.split(' ')[0] || visit.reference || text}${visit.guests ? ` · ${visit.guests}` : ''}`
            ) : state === 'blocked' && own[0]?.reason ? (
              own[0].reason
            ) : (
              text
            )}
          </span>
          {c?.priceSource === 'override' ? (
            <span
              className="ml-auto size-1.5 shrink-0 rounded-full bg-event-adjustment"
              title="Custom price"
              aria-hidden="true"
            />
          ) : null}
          {leaving && (
            <span
              className="ml-auto flex shrink-0 items-center"
              title={`Check-out ${time(leaving.ends_at)}`}
              data-leaving
            >
              <LogOut className="size-3" aria-hidden="true" />
              <span className="sr-only">Check-out {time(leaving.ends_at)}</span>
            </span>
          )}
        </span>
      );
    });
  }

  return (
    <section aria-label="Property calendar" className="space-y-4 pb-24 md:pb-0">
      {/* Toolbar */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex shrink-0 items-center rounded-md border border-border">
              <Link
                aria-label="Previous period"
                className="grid size-10 place-items-center rounded-l-md text-ink-700 hover:bg-ink-50"
                href={href({
                  from: view === 'month' ? monthMove(-1) : addLocalDays(data.from, -data.days),
                })}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
              <Link
                className="flex h-10 items-center border-x border-border px-3 text-meta font-semibold text-ink-800 hover:bg-ink-50"
                href={href({ from: today })}
              >
                Today
              </Link>
              <Link
                aria-label="Next period"
                className="grid size-10 place-items-center rounded-r-md text-ink-700 hover:bg-ink-50"
                href={href({
                  from: view === 'month' ? monthMove(1) : addLocalDays(data.from, data.days),
                })}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <h2 className="ml-1 truncate text-h4 font-semibold text-ink-900 sm:w-56 sm:text-h3">
              {periodTitle}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav
              aria-label="Calendar view"
              className="inline-flex h-11 items-center gap-0.5 rounded-md border border-border bg-ink-25 p-1"
            >
              {VIEWS.map(([value, text]) => (
                <Link
                  key={value}
                  href={href({ view: value })}
                  aria-current={view === value ? 'page' : undefined}
                  className={segment(view === value)}
                >
                  {text}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3">
          <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {LEGEND.map((state) => (
              <li key={state} className="flex items-center gap-1.5 text-tiny text-ink-600">
                <span className={`size-2.5 rounded-sm ${states[state][3]}`} aria-hidden="true" />
                {states[state][0]}
              </li>
            ))}
            <li className="flex items-center gap-1.5 text-tiny text-ink-600">
              <span className="size-2 rounded-full bg-event-adjustment" aria-hidden="true" />
              Custom price
            </li>
            <li className="flex items-center gap-1.5 text-tiny text-ink-600">
              <LogIn className="size-3" aria-hidden="true" />
              Check-in
            </li>
            <li className="flex items-center gap-1.5 text-tiny text-ink-600">
              <LogOut className="size-3" aria-hidden="true" />
              Check-out
            </li>
          </ul>
          {/* 6. Jump-to-date sized like the other toolbar controls */}
          <label className="flex items-center gap-2 text-tiny text-ink-600">
            Jump to
            <input
              type="date"
              defaultValue={anchor}
              onChange={(e) => e.target.value && router.push(href({ from: e.target.value }))}
              className="h-10 min-h-10 rounded-md border border-border bg-card px-2.5 text-ink-800 hover:border-primary md:text-meta!"
            />
          </label>
        </div>
      </div>

      {!data.items.length && (
        <EmptyState
          title="Add a property to see your calendar"
          description="Your dates, bookings and prices will appear here."
          actionHref="/partner/listings"
          actionLabel="Add property"
        />
      )}
      {data.items.map((property) => (
        <article key={property.id} className="space-y-3">
          {data.items.length > 1 && view !== 'multi' ? (
            <h2 className="text-h4 font-semibold">{property.title || 'Untitled draft'}</h2>
          ) : null}
          {property.rentalUnit !== 'hour' &&
            property.cells?.some((c) => c.date >= today) &&
            property.cells
              .filter((c) => c.date >= today)
              .every((c) => c.state === 'closed' || c.state === 'beyond') && (
              <EmptyState
                variant="compact"
                title="No dates open"
                description="Guests cannot book until dates are open."
                actionHref={`/partner/listings/${property.id}/booking-rules`}
                actionLabel="Set up auto-open"
              />
            )}
          {property.rentalUnit !== 'hour' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-tiny font-semibold text-ink-500">Quick select</span>
              {['Weekends', 'Every Friday', 'Next 30 days'].map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-tiny font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50"
                  onClick={() => {
                    setSelected(
                      days
                        .filter((d) =>
                          choice === 'Next 30 days' || choice === 'Weekends'
                            ? (property.config?.weekendDays || [0, 6]).includes(
                                new Date(d + 'T00:00:00Z').getUTCDay(),
                              ) ||
                              (choice === 'Next 30 days' &&
                                d >= today &&
                                d < addLocalDays(today, 30))
                            : new Date(d + 'T00:00:00Z').getUTCDay() === 5,
                        )
                        .map((date) => ({ id: property.id, date })),
                    );
                    setResult({});
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : null}
          {view === 'month' && property.rentalUnit !== 'hour' && (
            <div
              className="grid grid-cols-7 gap-1 rounded-lg border border-border bg-card p-2 md:hidden"
              aria-label="Month at a glance"
            >
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <p
                  key={i}
                  aria-hidden="true"
                  className="py-1 text-center text-tiny font-semibold text-ink-500"
                >
                  {d}
                </p>
              ))}
              {days.map((day) => {
                const cells = property.cells?.filter((c) => c.date === day) || [];
                const on = dots.filter(([key]) =>
                  key === 'override'
                    ? cells.some((c) => c.priceSource === 'override')
                    : key === 'closed'
                      ? cells.some((c) => ['closed', 'blocked'].includes(c.state))
                      : cells.some((c) => c.state === key),
                );
                const outside = day.slice(0, 7) !== anchor.slice(0, 7);
                return (
                  <button
                    key={day}
                    type="button"
                    data-mini-day={day}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-meta tabular hover:bg-ink-50 ${outside ? 'text-ink-400' : 'text-ink-900'}`}
                    aria-label={`${dayText(day)}${on.length ? ': ' + on.map((d) => d[2]).join(', ') : ''}`}
                    onClick={() => open(property, day)}
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-full ${day === today ? 'bg-brand-600 font-semibold text-white' : ''}`}
                    >
                      {Number(day.slice(-2))}
                    </span>
                    <span className="flex h-1.5 justify-center gap-0.5">
                      {on.map(([key, tone]) => (
                        <span key={key} className={`size-1.5 rounded-full ${tone}`} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div
            className={
              view === 'multi'
                ? 'flex gap-px overflow-x-auto rounded-lg border border-border bg-border'
                : view === 'agenda'
                  ? 'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card'
                  : `grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid md:grid-cols-7 ${view === 'month' && property.rentalUnit !== 'hour' ? 'hidden' : 'grid'}`
            }
          >
            {view === 'multi' && (
              <div className="sticky left-0 z-10 flex w-28 shrink-0 flex-col gap-2 bg-card p-2 sm:w-36">
                {property.photo && (
                  // eslint-disable-next-line @next/next/no-img-element -- small owner thumbnail from the API
                  <img
                    src={property.photo.url}
                    alt=""
                    className="aspect-4/3 w-full rounded-md object-cover"
                  />
                )}
                <h2 className="line-clamp-2 text-meta font-semibold">
                  {property.title || 'Untitled draft'}
                </h2>
              </div>
            )}
            {view === 'month' &&
              ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <p
                  key={day}
                  className="hidden bg-ink-25 py-2 text-center text-tiny font-semibold text-ink-500 md:block"
                >
                  {day}
                </p>
              ))}
            {days.map((day, i) => {
              const picked = selected.some((r) => r.id === property.id && r.date === day);
              const outside = view === 'month' && day.slice(0, 7) !== anchor.slice(0, 7);
              const isToday = day === today;
              return (
                <button
                  key={day}
                  data-calendar-day={day}
                  type="button"
                  className={`group relative min-w-0 text-left transition-colors focus-visible:z-10 ${
                    view === 'agenda'
                      ? 'flex w-full items-start gap-4 px-4 py-3 hover:bg-ink-25'
                      : `min-h-28 p-1.5 ${view === 'multi' ? 'min-w-32' : ''} ${outside ? 'bg-ink-25' : 'bg-card'} hover:bg-brand-50/40`
                  } ${picked ? 'bg-brand-50! ring-2 ring-brand-600 ring-inset' : ''} ${day < today ? 'opacity-70' : ''}`}
                  aria-label={`${property.title}, ${dayText(day)}${
                    property.rentalUnit === 'hour'
                      ? ''
                      : ['day', 'night']
                          .map((slot) => {
                            const c = property.cells?.find(
                              (x) => x.date === day && x.slot === slot,
                            );
                            const price =
                              c?.state === 'open' && c?.effectivePriceMinor != null
                                ? ` ${money(c.effectivePriceMinor)}`
                                : '';
                            return `, ${label(slot)} ${states[c?.state || 'closed'][0].toLowerCase()}${price}`;
                          })
                          .join('')
                  }`}
                  aria-pressed={picked}
                  onPointerDown={() => {
                    drag.current = { id: property.id, index: i, time: Date.now() };
                  }}
                  onPointerEnter={(e) => {
                    if (e.buttons && drag.current && drag.current.id === property.id) {
                      drag.current.moved = i !== drag.current.index;
                      const range = days.slice(
                        Math.min(i, drag.current.index),
                        Math.max(i, drag.current.index) + 1,
                      );
                      setSelected(range.map((date) => ({ id: property.id, date })));
                    }
                  }}
                  onClick={(e) => {
                    if (drag.current?.moved) {
                      drag.current = null;
                      return;
                    }
                    if (
                      e.shiftKey ||
                      e.ctrlKey ||
                      selected.length ||
                      Date.now() - (drag.current?.time || Date.now()) > 500
                    ) {
                      toggle(property.id, day);
                      return;
                    }
                    open(property, day);
                  }}
                  onKeyDown={(e) => {
                    const movement = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[
                      e.key
                    ];
                    if (movement) {
                      e.preventDefault();
                      e.currentTarget.parentElement
                        .querySelector(
                          `[data-calendar-day="${days[Math.max(0, Math.min(days.length - 1, i + movement))]}"]`,
                        )
                        ?.focus();
                    }
                    if (e.key === ' ') {
                      e.preventDefault();
                      toggle(property.id, day);
                    }
                  }}
                >
                  <time
                    dateTime={day}
                    className={
                      view === 'agenda'
                        ? 'w-24 shrink-0 pt-1 text-meta font-semibold text-ink-900'
                        : 'flex items-center justify-between'
                    }
                  >
                    {view === 'agenda' ? (
                      <>
                        {dayText(day)}
                        {isToday ? (
                          <span className="mt-1 block text-tiny font-semibold text-brand-700">
                            Today
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <span className="text-tiny text-ink-500 md:hidden">{dayText(day)}</span>
                        <span
                          className={`hidden size-6 place-items-center rounded-full text-tiny font-semibold tabular md:grid ${isToday ? 'bg-brand-600 text-white' : outside ? 'text-ink-400' : 'text-ink-800'}`}
                        >
                          {Number(day.slice(-2))}
                        </span>
                        {view !== 'month' ? (
                          <span className="hidden text-tiny text-ink-500 md:inline">
                            {dayText(day).split(' ')[0]}
                          </span>
                        ) : null}
                      </>
                    )}
                  </time>
                  <span
                    className={view === 'agenda' ? 'grid flex-1 gap-1 sm:grid-cols-2' : 'block'}
                  >
                    {lanes(property, day, view === 'month' || view === 'week' ? i % 7 : -1)}
                  </span>
                </button>
              );
            })}
          </div>
        </article>
      ))}

      {/* Bulk selection bar */}
      {selected.length > 0 && !opened && (
        <aside
          aria-label="Change selected dates"
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 max-h-[60dvh] overflow-auto rounded-lg border border-brand-200 bg-card shadow-lg md:bottom-4"
        >
          <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <p className="text-meta">
              <span className="font-semibold text-ink-900 tabular">{selected.length}</span>{' '}
              {selected.length === 1 ? 'date' : 'dates'} selected
            </p>
            <button
              className={button('ghost')}
              onClick={() => {
                setSelected([]);
                setResult({});
              }}
            >
              Clear
            </button>
          </div>
          <div className="p-4">{commands}</div>
        </aside>
      )}

      {/* Date detail drawer */}
      <dialog
        data-calendar-detail
        ref={dialog}
        aria-labelledby={detailHeading}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-auto rounded-t-xl border-0 bg-ink-25 p-0 text-foreground shadow-xl backdrop:bg-brand-950/40 md:top-0 md:left-auto md:h-dvh md:max-h-none md:w-120 md:rounded-none"
      >
        {opened && (
          <>
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-tiny font-semibold text-ink-500">
                  {opened.property.title}
                </p>
                <h2 id={detailHeading} className="text-h3 font-semibold text-ink-900">
                  {longDay(opened.date)}
                </h2>
                {opened.date === today ? (
                  <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-tiny font-semibold text-brand-700">
                    Today
                  </span>
                ) : null}
              </div>
              <button
                className="grid size-11 shrink-0 place-items-center rounded-md text-ink-600 hover:bg-ink-100"
                onClick={close}
                aria-label="Close date detail"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>
            {!detail ? (
              <div role="status" aria-busy="true" className="space-y-4 p-5">
                <span className="sr-only">Loading date</span>
                {[0, 1].map((item) => (
                  <div key={item} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="mt-3 h-6 w-28" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </div>
                ))}
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : detail.error ? (
              <p
                role="alert"
                className="m-5 rounded-md border border-danger/30 bg-danger-bg p-3 text-meta"
              >
                {detail.error}
              </p>
            ) : (
              <div className="space-y-6 p-5">
                {detail.cells?.length ? (
                  <section aria-label="Slots" className="space-y-2">
                    <h3 className="text-meta font-semibold text-ink-900">Slots</h3>
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                      {detail.cells.map((c) => (
                        <li key={c.slot} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-meta font-semibold text-ink-900">{label(c.slot)}</p>
                            <p className="text-tiny text-ink-500">
                              {c.schedule
                                ? `${c.schedule.startTime}–${c.schedule.endTime}${c.schedule.endDayOffset ? ' next day' : ''} IST`
                                : 'Hours not set'}
                              {c.priceSource === 'override' ? ' · Custom price' : ''}
                            </p>
                            {c.state === 'problem' && (
                              <p className="mt-1 text-tiny text-danger">
                                Rentra is checking this date; contact support.
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-h4 font-semibold text-ink-900 tabular">
                              {money(c.effectivePriceMinor)}
                            </p>
                            <StateBadge state={c.state} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {detail.intervals?.length ? (
                  <section aria-label="Bookings and blocks" className="space-y-2">
                    <h3 className="text-meta font-semibold text-ink-900">Bookings and blocks</h3>
                    <ul className="space-y-2">
                      {detail.intervals.map((r) => {
                        const name =
                          r.kind === 'offline_booking'
                            ? r.details?.name || 'Guest'
                            : r.guest_name ||
                              r.reason ||
                              r.reference ||
                              (r.state === 'held' ? 'Temporary hold' : 'Owner block');
                        const phone = r.guest_phone?.replace(/\D/g, '');
                        return (
                          <li
                            key={r.id}
                            className="space-y-3 rounded-lg border border-border bg-card p-4"
                          >
                            <div className="flex items-start gap-3">
                              <span
                                aria-hidden="true"
                                className={`grid size-10 shrink-0 place-items-center rounded-full text-meta font-semibold ${r.source === 'owner_block' ? 'bg-ink-100 text-ink-600' : 'bg-brand-50 text-brand-700'}`}
                              >
                                {r.source === 'owner_block' ? (
                                  <Lock className="size-4" />
                                ) : (
                                  initials(name)
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-ink-900">{name}</p>
                                <p className="text-tiny text-ink-500">
                                  {r.kind === 'offline_booking'
                                    ? 'Offline booking'
                                    : r.source === 'owner_block'
                                      ? 'Blocked by you'
                                      : r.state === 'held'
                                        ? 'Payment in progress'
                                        : 'Rentra booking'}
                                  {r.guests ? ` · ${r.guests} guests` : ''}
                                  {r.reference && r.source !== 'owner_block'
                                    ? ` · ${r.reference}`
                                    : ''}
                                </p>
                              </div>
                              {r.hold_expires_at ? (
                                <span className="rounded-full bg-warning-bg px-2 py-0.5 text-tiny font-semibold text-warning">
                                  <Hold
                                    expires={r.hold_expires_at}
                                    onExpire={() => open(opened.property, opened.date)}
                                  />
                                </span>
                              ) : null}
                            </div>
                            {r.starts_at ? (
                              <p className="flex items-center gap-2 rounded-md bg-ink-25 px-3 py-2 text-meta text-ink-700 tabular">
                                <Clock
                                  className="size-4 shrink-0 text-ink-500"
                                  aria-hidden="true"
                                />
                                {dateTime(r.starts_at)}
                                {r.ends_at
                                  ? ` – ${dayKey(r.ends_at) === dayKey(r.starts_at) ? time(r.ends_at) : dateTime(r.ends_at)}`
                                  : ''}
                              </p>
                            ) : null}
                            {r.rent_minor != null && (
                              <p className="text-meta text-ink-700">
                                Booked rent{' '}
                                <strong className="text-ink-900 tabular">
                                  {money(r.rent_minor)}
                                </strong>
                                <span className="block text-tiny text-ink-500">
                                  {EARNINGS_NOTICE}
                                </span>
                              </p>
                            )}
                            {r.source === 'owner_block' && r.reason ? (
                              <p className="text-meta text-ink-700">{r.reason}</p>
                            ) : null}
                            {phone || r.order_id ? (
                              <div className="flex flex-wrap gap-2">
                                {phone ? (
                                  <>
                                    <a className={button()} href={`tel:${r.guest_phone}`}>
                                      <Phone className="size-4" aria-hidden="true" />
                                      Call
                                    </a>
                                    <a
                                      className={button()}
                                      href={`https://wa.me/${phone.length === 10 ? '91' : ''}${phone}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MessageCircle className="size-4" aria-hidden="true" />
                                      WhatsApp
                                    </a>
                                  </>
                                ) : null}
                                {r.order_id && (
                                  <Link
                                    className={button('primary')}
                                    href={`/partner/bookings/${r.order_id}`}
                                  >
                                    Open booking
                                    <ExternalLink className="size-4" aria-hidden="true" />
                                  </Link>
                                )}
                              </div>
                            ) : null}
                            {r.source === 'owner_block' && (
                              <ActionForm
                                action={unblockDates}
                                rentableId={opened.property.id}
                                calendarVersion={detail.version}
                                title={null}
                                button="Release block"
                                className="space-y-3"
                              >
                                <input type="hidden" name="blockId" value={r.id} />
                              </ActionForm>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}

                {opened.property.rentalUnit === 'hour' ? (
                  <Link
                    className={`${button('primary')} w-full`}
                    href={`/partner/listings/${opened.property.id}/calendar?date=${opened.date}`}
                  >
                    Open court timeline
                  </Link>
                ) : (
                  <>
                    <section
                      aria-label="Change this date"
                      className="space-y-3 rounded-lg border border-border bg-card p-4"
                    >
                      <h3 className="text-meta font-semibold text-ink-900">Change this date</h3>
                      {commands}
                    </section>
                    <div className="space-y-2">
                      <Disclosure
                        title="Block exact hours"
                        hint={`Starts from the ${label(slots[0]).toLowerCase()} hours`}
                      >
                        <ActionForm
                          key={slots[0]}
                          action={blockDates}
                          rentableId={opened.property.id}
                          calendarVersion={detail.version}
                          title={null}
                          button="Block period"
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            {['from', 'to'].map((name) => (
                              <label
                                key={name}
                                className="block text-tiny font-semibold text-ink-600"
                              >
                                {name === 'from' ? 'From date' : 'To date'}
                                <input
                                  name={name}
                                  type="date"
                                  defaultValue={
                                    name === 'to' && blockSchedule?.endDayOffset
                                      ? addLocalDays(opened.date, blockSchedule.endDayOffset)
                                      : opened.date
                                  }
                                  className={`${fieldClass} mt-1.5`}
                                  required
                                />
                              </label>
                            ))}
                            {['startTime', 'endTime'].map((name) => (
                              <label
                                key={name}
                                className="block text-tiny font-semibold text-ink-600"
                              >
                                {name === 'startTime' ? 'From time (IST)' : 'To time (IST)'}
                                <input
                                  name={name}
                                  type="time"
                                  defaultValue={blockSchedule?.[name]}
                                  className={`${fieldClass} mt-1.5`}
                                  required
                                />
                              </label>
                            ))}
                          </div>
                          <label className="block text-tiny font-semibold text-ink-600">
                            Reason
                            <input
                              name="reason"
                              minLength={3}
                              maxLength={500}
                              required
                              placeholder="e.g. Family function, maintenance"
                              className={`${fieldClass} mt-1.5`}
                            />
                          </label>
                        </ActionForm>
                      </Disclosure>
                      <OfflineBooking property={opened.property} date={opened.date} />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </dialog>
      {data.page > 1 || data.hasMore ? (
        <nav aria-label="Calendar property pages" className="flex justify-between gap-3">
          {data.page > 1 ? (
            <Link className={button()} href={href({ page: String(data.page - 1) })}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous properties
            </Link>
          ) : (
            <span />
          )}
          {data.hasMore && (
            <Link className={button()} href={href({ page: String(data.page + 1) })}>
              More properties
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </nav>
      ) : null}
    </section>
  );
}
