'use client';
import { OfflineBooking } from './CalendarTools';
import { displayMoney as money } from '@/lib/domain/display-money';
import { EARNINGS_NOTICE } from '@/lib/domain/owner-earnings';
import { ActionForm } from './listing/BookingCalendarSettings';
import { blockDates, unblockDates } from '@/lib/actions/partner';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import { CalendarCheck, Timer, Lock, Ban, Clock, AlertTriangle, Tag, X } from 'lucide-react';
import { addLocalDays, propertyToday } from '@/lib/domain/booking-dates';
import {
  loadCalendarDay,
  changeCalendarSelection,
  undoCalendarChange,
} from '@/lib/actions/partner';
const states = {
  open: ['Open', Tag, 'bg-card'],
  booked: ['Booked', CalendarCheck, 'bg-brand-100 border-brand-600'],
  hold: ['Hold', Timer, 'bg-warning-bg border-warning border-dashed'],
  blocked: ['Blocked', Lock, 'bg-secondary border-dashed'],
  closed: ['Closed', Ban, 'bg-secondary'],
  too_soon: ['Too soon', Clock, 'bg-secondary text-ink-700'],
  beyond: ['Not open yet', Clock, 'bg-secondary text-ink-700'],
  past: ['Past', Clock, 'bg-secondary text-ink-700'],
  problem: ['Check', AlertTriangle, 'border-danger border-2'],
};
const label = (s) => ({ day: 'Day picnic', night: 'Night stay', full_day: 'Full day' })[s] || s;
const field = 'min-h-11 rounded-md border bg-card p-2';
const dayText = (date) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(date + 'T00:00:00Z'));
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
export default function PortfolioCalendar({
  data,
  basePath = '/partner/calendar',
  view = 'month',
  listHref,
  anchor = propertyToday(),
}) {
  const router = useRouter(),
    dialog = useRef(null),
    drag = useRef(null);
  const [selected, setSelected] = useState([]),
    [opened, setOpened] = useState(null),
    [detail, setDetail] = useState(null),
    [result, setResult] = useState({}),
    [busy, setBusy] = useState(false),
    [legend, setLegend] = useState(false),
    [kind, setKind] = useState('slots'),
    [slot, setSlot] = useState('day'),
    [price, setPrice] = useState(''),
    [percent, setPercent] = useState(false);
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
    `${basePath}?${new URLSearchParams({ from: anchor, view, slot: data.slot || '', ...(data.property ? { property: data.property } : {}), ...(listHref ? { fromList: listHref } : {}), ...changes })}`;
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
  const close = () => {
    dialog.current?.close();
    setOpened(null);
    setSelected([]);
    setResult({});
  };
  async function save(openValue, confirm = false, reset = false) {
    const rows = selected.length ? selected : [{ id: opened.property.id, date: opened.date }];
    if (new Set(rows.map((r) => r.id)).size !== 1) {
      setResult({ error: 'Choose dates in one property to apply changes together.' });
      return;
    }
    const property = data.items.find((p) => p.id === rows[0].id),
      cells = rows.map((r) => ({ date: r.date, slot }));
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
  const commands = (
    <div className="space-y-3">
      <label className="block">
        Slot{' '}
        <select
          className={field}
          value={slot}
          onChange={(e) => {
            setSlot(e.target.value);
            setResult({});
          }}
        >
          {['day', 'night', 'full_day'].map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className={field}
          disabled={busy}
          onClick={() => {
            setKind('slots');
            setResult({});
          }}
        >
          Open / close
        </button>
        <button
          className={field}
          disabled={busy}
          onClick={() => {
            setKind('prices');
            setResult({});
          }}
        >
          Set price
        </button>
      </div>
      {kind === 'prices' && (
        <>
          <label className="block">
            {percent ? 'Change from base (%)' : 'Price (₹)'}
            <input
              className={field}
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setResult({});
              }}
            />
          </label>
          <label className="flex min-h-11 gap-2 items-center">
            <input
              type="checkbox"
              checked={percent}
              onChange={(e) => setPercent(e.target.checked)}
            />
            Percentage from base price
          </label>
        </>
      )}
      {!result.preview && (
        <div className="flex gap-2">
          {kind === 'slots' ? (
            <>
              <button className={field} disabled={busy} onClick={() => save(true)}>
                Reopen slot
              </button>
              <button className={field} disabled={busy} onClick={() => save(false)}>
                Close slot
              </button>
            </>
          ) : (
            <>
              <button className={field} disabled={busy} onClick={() => save(false)}>
                Preview price
              </button>
              <button className={field} disabled={busy} onClick={() => save(false, false, true)}>
                Reset price
              </button>
            </>
          )}
        </div>
      )}
      {result.preview && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="font-semibold">Review changes</p>
          {(result.preview.result?.affected || result.preview.affected || []).map((c, i) => (
            <p key={i} className="text-meta">
              {c.date} ? {label(c.slot)} ·{' '}
              {kind === 'prices' ? money(c.before) : c.before ? 'Open' : 'Closed'} ?{' '}
              {kind === 'prices' ? money(c.after) : c.after ? 'Open' : 'Closed'}
            </p>
          ))}
          {result.preview.result?.warnings?.map((w) => (
            <p key={w} className="text-warning">
              {w}
            </p>
          ))}
          {result.preview.result?.conflicts?.map((c) => (
            <p key={c.date + c.slot} className="text-danger">
              {c.date} ? {label(c.slot)} is reserved.
              {c.reservations.map((r) =>
                r.orderId ? (
                  <Link
                    key={r.id}
                    className="underline ml-2"
                    href={`/partner/bookings/${r.orderId}`}
                  >
                    Open booking
                  </Link>
                ) : null,
              )}
            </p>
          ))}
          <button
            className={field}
            disabled={busy || !!result.preview.result?.conflicts?.length}
            onClick={() => {
              const change = JSON.parse(result.preview.values.change);
              save(change.open, true, change.reset);
            }}
          >
            Confirm changes
          </button>
          <button className={field} onClick={() => setResult({})}>
            Cancel
          </button>
        </div>
      )}
      {result.error && (
        <p role="alert" className="text-danger">
          {result.error}
        </p>
      )}
      {result.ok && <p role="status">Changes saved.</p>}
      {result.undoToken && (
        <p role="status" className="rounded-lg border bg-card p-3">
          Changes saved.{' '}
          <button
            className={field}
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
  return (
    <section aria-label="Property calendar" className="space-y-5">
      <form className="flex flex-wrap items-end gap-3">
        <label>
          Start date
          <input type="date" name="from" defaultValue={anchor} className={field} />
        </label>
        <label>
          View
          <select name="view" defaultValue={view} className={field}>
            {['multi', 'month', 'week', 'agenda'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {basePath === '/partner/calendar' && (
          <label>
            Property
            <select name="property" defaultValue={data.property || ''} className={field}>
              <option value="">All properties</option>
              {data.items.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.title || 'Untitled draft'}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className={field}>Show calendar</button>
        <button type="button" className={field} onClick={() => setLegend((v) => !v)}>
          Legend
        </button>
      </form>
      <nav aria-label="Calendar periods" className="flex gap-3">
        <Link
          className={field}
          href={href({
            from: view === 'month' ? monthMove(-1) : addLocalDays(data.from, -data.days),
          })}
        >
          Previous
        </Link>
        <Link className={field} href={href({ from: propertyToday() })}>
          Today
        </Link>
        <Link
          className={field}
          href={href({
            from: view === 'month' ? monthMove(1) : addLocalDays(data.from, data.days),
          })}
        >
          Next
        </Link>
      </nav>
      {legend && (
        <ul className="flex flex-wrap gap-2" aria-label="Calendar legend">
          {Object.entries(states).map(([state, [text, Icon, tone]]) => (
            <li key={state} className={`flex items-center gap-2 rounded border p-2 ${tone}`}>
              <Icon className="size-4" />
              {text}
            </li>
          ))}
        </ul>
      )}
      <p className="text-meta text-ink-600">
        India time. Tap a date for details. Hold or Shift-select dates for a bulk change.
      </p>
      {data.items.map((property) => (
        <article key={property.id} className="space-y-3">
          <h2 className="text-h3">{property.title || 'Untitled draft'}</h2>
          <div className="flex flex-wrap gap-2">
            {['Weekends', 'Every Friday', 'Next 30 days'].map((choice) => (
              <button
                key={choice}
                className={field}
                onClick={() => {
                  setSelected(
                    days
                      .filter((d) =>
                        choice === 'Next 30 days' || choice === 'Weekends'
                          ? (property.config?.weekendDays || [0, 6]).includes(
                              new Date(d + 'T00:00:00Z').getUTCDay(),
                            ) ||
                            (choice === 'Next 30 days' &&
                              d >= propertyToday() &&
                              d < addLocalDays(propertyToday(), 30))
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
            <Link
              href={`/partner/listings/${property.id}/booking-rules`}
              className={`${field} underline`}
            >
              Booking rules
            </Link>
          </div>
          <div
            className={
              view === 'multi'
                ? 'flex overflow-x-auto gap-2'
                : view === 'agenda'
                  ? 'space-y-2'
                  : 'grid grid-cols-1 gap-2 md:grid-cols-7 md:gap-1'
            }
          >
            {view === 'month' &&
              ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <p key={day} className="hidden md:block text-center text-tiny font-semibold">
                  {day}
                </p>
              ))}
            {days.map((day, i) => {
              const picked = selected.some((r) => r.id === property.id && r.date === day);
              return (
                <button
                  key={day}
                  data-calendar-day={day}
                  type="button"
                  className={`min-h-24 min-w-0 rounded-md border p-1 text-left ${view === 'multi' ? 'min-w-28' : ''} ${view === 'month' && day.slice(0, 7) !== anchor.slice(0, 7) ? 'bg-secondary border-dashed' : ''} ${picked ? 'ring-2 ring-brand-600' : ''}`}
                  aria-label={`${property.title}, ${dayText(day)}`}
                  aria-pressed={picked}
                  onPointerDown={(e) => {
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
                  <time className="block text-tiny font-semibold">
                    <span className="md:hidden">{dayText(day)}</span>
                    <span className="hidden md:inline">
                      {view === 'agenda' ? dayText(day) : Number(day.slice(-2))}
                    </span>
                  </time>
                  {property.rentalUnit === 'hour' ? (
                    <span className="text-tiny">
                      {property.intervals.filter((r) => r.starts_at?.slice(0, 10) === day).length}{' '}
                      visits · Court timeline
                    </span>
                  ) : (
                    ['day', 'night'].map((s) => {
                      const c = property.cells?.find((c) => c.date === day && c.slot === s),
                        [text, Icon, tone] = states[c?.state || 'closed'];
                      return (
                        <span
                          key={s}
                          className={`mt-1 flex min-h-9 items-center gap-1 rounded border p-1 text-[10px] sm:text-tiny ${tone}`}
                        >
                          <Icon className="size-3 shrink-0" />
                          <span className="truncate">
                            {s === 'day' ? 'Day' : 'Night'} ·{' '}
                            {c?.state === 'open' ? money(c.effectivePriceMinor) : text}
                            {c?.priceSource === 'override' ? ' *' : ''}
                          </span>
                        </span>
                      );
                    })
                  )}
                </button>
              );
            })}
          </div>
        </article>
      ))}
      {selected.length > 0 && !opened && (
        <aside className="sticky bottom-4 z-20 rounded-xl border bg-card p-4 shadow-lg">
          <div className="flex justify-between">
            <p>{selected.length} dates selected</p>
            <button className={field} onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
          {commands}
        </aside>
      )}
      <dialog
        ref={dialog}
        onCancel={close}
        className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none max-h-[90dvh] overflow-auto rounded-t-xl border bg-card p-5 text-foreground backdrop:bg-black/30 md:left-auto md:top-0 md:h-dvh md:max-h-none md:w-[32rem] md:rounded-none md:p-7"
      >
        {opened && (
          <>
            <header className="flex justify-between gap-3">
              <h2 className="text-h3">
                {dayText(opened.date)} · {opened.property.title}
              </h2>
              <button className={field} onClick={close} aria-label="Close date detail">
                <X className="size-5" />
              </button>
            </header>
            {!detail ? (
              <p role="status">Loading date…</p>
            ) : detail.error ? (
              <p role="alert">{detail.error}</p>
            ) : (
              <div className="space-y-4 mt-4">
                {detail.cells?.map((c) => (
                  <section key={c.slot} className="rounded-lg border p-3">
                    <h3 className="font-semibold">
                      {label(c.slot)} · {money(c.effectivePriceMinor)}
                    </h3>
                    <p>
                      {states[c.state][0]}
                      {c.schedule
                        ? ` · ${c.schedule.startTime}–${c.schedule.endTime}${c.schedule.endDayOffset ? ' next day' : ''}`
                        : ''}
                    </p>
                    {c.state === 'problem' && <p>Rentra is checking this date; contact support.</p>}
                  </section>
                ))}
                {detail.intervals?.map((r) => (
                  <section key={r.id} className="rounded-lg border p-3">
                    <p>
                      {r.kind === 'offline_booking'
                        ? `Offline booking · ${r.details?.name || 'Guest'}`
                        : r.guest_name?.split(' ')[0] ||
                          r.reason ||
                          r.reference ||
                          'Temporary hold'}
                      {r.guests ? ` · ${r.guests} guests` : ''}
                    </p>
                    {r.hold_expires_at && (
                      <Hold
                        expires={r.hold_expires_at}
                        onExpire={() => open(opened.property, opened.date)}
                      />
                    )}
                    <p>
                      {r.starts_at
                        ? new Date(r.starts_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                          })
                        : ''}{' '}
                      {r.ends_at
                        ? `– ${new Date(r.ends_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                        : ''}
                    </p>
                    {r.rent_minor != null && (
                      <p>
                        Booked rent {money(r.rent_minor)}. {EARNINGS_NOTICE}
                      </p>
                    )}{' '}
                    {r.guest_phone && (
                      <div className="flex gap-3">
                        <a className="min-h-11 underline" href={`tel:${r.guest_phone}`}>
                          Call guest
                        </a>
                        <a
                          className="min-h-11 underline"
                          href={`https://wa.me/${r.guest_phone.replace(/\D/g, '').length === 10 ? '91' : ''}${r.guest_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}
                    {r.source === 'owner_block' && (
                      <ActionForm
                        action={unblockDates}
                        rentableId={opened.property.id}
                        calendarVersion={detail.version}
                        title="Release this block"
                        button="Release block"
                      >
                        <input type="hidden" name="blockId" value={r.id} />
                        <p>{r.reason}</p>
                      </ActionForm>
                    )}
                    {r.order_id && (
                      <Link
                        className="inline-flex min-h-11 underline"
                        href={`/partner/bookings/${r.order_id}`}
                      >
                        Open booking
                      </Link>
                    )}
                  </section>
                ))}
                {opened.property.rentalUnit === 'hour' ? (
                  <Link
                    className={field}
                    href={`/partner/listings/${opened.property.id}/calendar?date=${opened.date}`}
                  >
                    Open court timeline
                  </Link>
                ) : (
                  <>
                    {commands}
                    <details className="rounded-lg border p-3">
                      <summary className="min-h-11 font-semibold cursor-pointer">
                        Block an exact period
                      </summary>
                      <ActionForm
                        action={blockDates}
                        rentableId={opened.property.id}
                        calendarVersion={detail.version}
                        title="Block hours"
                        button="Block period"
                      >
                        {['from', 'to'].map((name) => (
                          <label key={name}>
                            {name === 'from' ? 'From date' : 'To date'}
                            <input
                              name={name}
                              type="date"
                              defaultValue={opened.date}
                              className={field}
                              required
                            />
                          </label>
                        ))}
                        {['startTime', 'endTime'].map((name) => (
                          <label key={name}>
                            {name === 'startTime' ? 'From time (India)' : 'To time (India)'}
                            <input name={name} type="time" className={field} required />
                          </label>
                        ))}
                        <label>
                          Reason
                          <input
                            name="reason"
                            minLength={3}
                            maxLength={500}
                            required
                            className={field}
                          />
                        </label>
                      </ActionForm>
                    </details>
                    <OfflineBooking property={opened.property} date={opened.date} />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </dialog>
      <nav aria-label="Calendar property pages" className="flex gap-3">
        {data.page > 1 && (
          <Link href={href({ page: String(data.page - 1) })}>Previous properties</Link>
        )}
        {data.hasMore && <Link href={href({ page: String(data.page + 1) })}>More properties</Link>}
      </nav>
    </section>
  );
}
