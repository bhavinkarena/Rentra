'use client';
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Lock, Pencil, X } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { changeHotelAri, changeStaffHotelAri } from '@/lib/actions/hotel-ops';
import { displayMoney } from '@/lib/domain/display-money';
import { formDirty } from '@/lib/domain/hotel-ui';

/**
 * Rates & rooms for a hotel (hotel plan, Phase 5): room types × nights. Each
 * cell shows rooms open (of rooms given to Rentra), booked, the room-only price
 * and restrictions. Edits go through one drawer (one night or a range, some
 * weekdays, some room types) with a preview count before saving.
 * Front desk sees the same grid but can only open and close rooms.
 */
const input = `${fieldClass} mt-1`;
const button = `${buttonVariants({ shape: 'default', size: 'default' })} min-h-[44px]!`;
const WEEKDAYS = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [0, 'Sun'],
];
const OPS = [
  ['price', 'Set room-only price', '₹ per night'],
  ['pricePct', 'Change price by %', '% (e.g. 20 or -10)'],
  ['resetPrice', 'Back to weekday/weekend price', null],
  ['rooms', 'Rooms open to Rentra', 'rooms'],
  ['close', 'Close (stop selling)', null],
  ['open', 'Open again', null],
  ['minNights', 'Minimum nights on arrival', 'nights'],
  ['closeArrival', 'No arrivals on these nights', null],
  ['openArrival', 'Allow arrivals again', null],
];
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayLabel = (date, options) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', ...options });

/** Fixed-date periods owners raise prices for; next occurrence from today. */
function presets(today) {
  const year = Number(today.slice(0, 4));
  const next = (month, day, length) => {
    for (const y of [year, year + 1]) {
      const from = `${y}-${month}-${day}`;
      if (addDays(from, length - 1) >= today)
        return { from: from < today ? today : from, to: addDays(from, length - 1) };
    }
    return null;
  };
  let saturday = today;
  while (new Date(`${saturday}T00:00:00Z`).getUTCDay() !== 5) saturday = addDays(saturday, 1);
  return [
    ['Next 4 weekends', { from: saturday, to: addDays(saturday, 22), weekdays: [5, 6] }],
    ['Next 30 days', { from: today, to: addDays(today, 29) }],
    ['Uttarayan (14–15 Jan)', next('01', '14', 2)],
    ['Christmas – New Year', next('12', '24', 9)],
  ].filter(([, range]) => range);
}

export default function HotelRatesCalendar({ propertyId, data, baseHref, staff = false }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState(null);
  const ops = data.canEditPrices ? OPS : OPS.filter(([op]) => ['close', 'open'].includes(op));
  const open = (patch = {}) =>
    setDrawer({
      from: data.from < data.today ? data.today : data.from,
      to: data.from < data.today ? data.today : data.from,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      roomTypeIds: data.roomTypes.map((r) => r.id),
      op: ops[0][0],
      value: '',
      ...patch,
    });
  const nav = (days) => `${baseHref}&from=${addDays(data.from, days)}`;
  const title = `${dayLabel(data.from, { day: 'numeric', month: 'short' })} – ${dayLabel(data.dates.at(-1).date, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  if (!data.roomTypes.length)
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-meta">
        {staff ? (
          'The owner has not added room types yet.'
        ) : (
          <>
            Add room types and rates first.{' '}
            <Link
              href={`/partner/listings/${propertyId}/setup/space`}
              className="font-semibold text-brand-700 underline"
            >
              Open Rooms
            </Link>
          </>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border">
          <Link
            href={nav(-data.days)}
            aria-label="Earlier nights"
            className="inline-flex size-11 items-center justify-center hover:bg-ink-50"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href={`${baseHref}&from=${data.today}`}
            className="inline-flex min-h-11 items-center border-x border-border px-3 text-meta font-semibold"
          >
            Today
          </Link>
          <Link
            href={nav(data.days)}
            aria-label="Later nights"
            className="inline-flex size-11 items-center justify-center hover:bg-ink-50"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="min-w-40 font-semibold tabular">{title}</p>
        <span className="flex-1" />
        <button type="button" onClick={() => open()} className={button}>
          <Pencil className="size-4" aria-hidden="true" />{' '}
          {data.canEditPrices ? 'Change rates or rooms' : 'Open or close rooms'}
        </button>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-tiny text-ink-700" aria-label="Legend">
        <li>Number = rooms still open to guests</li>
        <li>
          <span className="font-semibold text-warning">Amber</span>: 2 or fewer left
        </li>
        <li>
          <span className="rounded bg-event-adjustment-bg px-1 text-event-adjustment">Purple</span>:
          date price
        </li>
        <li className="inline-flex items-center gap-1">
          <Lock className="size-3" aria-hidden="true" /> closed
        </li>
      </ul>

      {/* Desktop grid */}
      <div
        className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block"
        role="region"
        aria-label="Rates and rooms grid"
        tabIndex={0}
      >
        <table className="w-full border-separate border-spacing-0 text-meta tabular">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-48 border-b border-border bg-card px-3 py-2 text-left"
              >
                Room type
              </th>
              {data.dates.map((d) => (
                <th
                  key={d.date}
                  scope="col"
                  className={`min-w-20 border-b border-l border-border px-2 py-2 text-center font-semibold ${d.weekend ? 'bg-ink-50' : ''}`}
                >
                  <span className="block text-tiny font-medium text-ink-600">
                    {dayLabel(d.date, { weekday: 'short' })}
                  </span>
                  <span
                    className={
                      d.date === data.today
                        ? 'inline-grid size-7 place-items-center rounded-full bg-brand-600 text-white'
                        : ''
                    }
                  >
                    {dayLabel(d.date, { day: 'numeric' })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.roomTypes.map((room) => (
              <Fragment key={room.id}>
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-border bg-card px-3 py-2 text-left font-semibold"
                  >
                    {room.name}
                    <span className="block text-tiny font-normal text-ink-600">
                      {room.roomCount} rooms
                    </span>
                  </th>
                  {room.nights.map((n) => {
                    const past = n.date < data.today;
                    return (
                      <td
                        key={n.date}
                        className={`border-b border-l border-border p-0 text-center ${n.stopSell ? 'bg-ink-100' : ''}`}
                      >
                        <button
                          type="button"
                          disabled={past}
                          onClick={() => open({ from: n.date, to: n.date, roomTypeIds: [room.id] })}
                          aria-label={`${room.name}, ${dayLabel(n.date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${n.stopSell ? 'closed' : `${n.open} of ${n.allotment} open`}, ${n.sold} booked${n.priceMinor ? `, ${displayMoney(n.priceMinor)}` : ''}. Edit`}
                          className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 px-1 py-1 hover:bg-brand-50 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          {n.stopSell ? (
                            <Lock className="size-4 text-ink-600" aria-hidden="true" />
                          ) : (
                            <span
                              className={`text-body font-bold ${n.open <= 2 ? 'text-warning' : 'text-ink-900'}`}
                            >
                              {n.open}
                            </span>
                          )}
                          <span className="text-tiny text-ink-600">{n.sold} booked</span>
                          {n.priceMinor ? (
                            <span
                              className={`rounded px-1 text-tiny ${n.customPrice ? 'bg-event-adjustment-bg text-event-adjustment' : 'text-ink-700'}`}
                            >
                              {displayMoney(n.priceMinor)}
                            </span>
                          ) : null}
                          {n.minNights || n.closedToArrival ? (
                            <span className="text-tiny text-ink-600">
                              {[
                                n.minNights ? `min ${n.minNights}` : null,
                                n.closedToArrival ? 'no arrival' : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
                {(room.derivedPlans ?? []).map((plan) => (
                  <tr key={plan.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-border bg-card px-3 py-1 pl-6 text-left text-tiny font-normal text-ink-700"
                    >
                      {plan.name}
                      <span className="block text-ink-600">Linked offer · follows base price</span>
                    </th>
                    {plan.prices.map((price, i) => (
                      <td
                        key={room.nights[i].date}
                        className="border-b border-l border-border px-1 py-1 text-center text-tiny text-ink-700"
                      >
                        {displayMoney(price)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: one card per night */}
      <ol className="space-y-3 md:hidden">
        {data.dates
          .filter((d) => d.date >= data.today)
          .map((d) => (
            <li key={d.date} className="rounded-lg border border-border bg-card p-3">
              <p className="font-semibold">
                {dayLabel(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                {d.date === data.today ? (
                  <span className="ml-2 text-tiny text-brand-700">Today</span>
                ) : null}
              </p>
              <ul className="mt-2 divide-y divide-border">
                {data.roomTypes.map((room) => {
                  const n = room.nights.find((x) => x.date === d.date);
                  return (
                    <li
                      key={room.id}
                      className="flex items-center justify-between gap-3 py-2 text-meta"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{room.name}</span>
                        <span className="text-tiny text-ink-600">
                          {n.stopSell ? 'Closed' : `${n.open} of ${n.allotment} open`} · {n.sold}{' '}
                          booked
                          {n.priceMinor ? ` · ${displayMoney(n.priceMinor)}` : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          open({
                            from: d.date,
                            to: d.date,
                            roomTypeIds: [room.id],
                            op: n.stopSell ? 'open' : 'close',
                          })
                        }
                        className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border px-3 text-tiny font-semibold"
                      >
                        {n.stopSell ? 'Open' : 'Close'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
      </ol>

      {drawer ? (
        <EditDrawer
          key={JSON.stringify(drawer)}
          initial={drawer}
          ops={ops}
          data={data}
          propertyId={propertyId}
          staff={staff}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function EditDrawer({ initial, ops, data, propertyId, staff, onClose, onSaved }) {
  const command = staff ? changeStaffHotelAri : changeHotelAri;
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const drawerRef = useRef(null);
  const keepRef = useRef(null);
  const dirty = formDirty(initial, form);
  const requestClose = () => (dirty ? setConfirming(true) : onClose());
  const cancelConfirm = () => {
    setConfirming(false);
    drawerRef.current?.focus();
  };
  // Focus moves into the drawer and returns to the cell that opened it.
  useEffect(() => {
    const opener = document.activeElement;
    drawerRef.current?.focus();
    // If a refresh replaced the opener, fall back to the grid.
    return () =>
      (opener?.isConnected
        ? opener
        : document.querySelector('[aria-label="Rates and rooms grid"]')
      )?.focus?.();
  }, []);
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  // Escape closes the drawer (asking first when dirty); with the confirm open it cancels only the confirm.
  useEffect(() => {
    const onKey = (event) => {
      // Tab stays inside the drawer (the confirm traps its own Tab).
      if (event.key === 'Tab' && !confirming && drawerRef.current) {
        const items = [
          ...drawerRef.current.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((el) => !el.closest('[role="alertdialog"]'));
        if (!items.length) return;
        const first = items[0];
        const last = items.at(-1);
        const inside = drawerRef.current.contains(document.activeElement);
        if (
          event.shiftKey &&
          (!inside ||
            document.activeElement === first ||
            document.activeElement === drawerRef.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (confirming) cancelConfirm();
      else requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    if (!dirty) return undefined;
    const guard = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const op = ops.find(([value]) => value === form.op) ?? ops[0];
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setResult(null);
    setNotice('');
  };
  const toggle = (key, value) =>
    set({
      [key]: form[key].includes(value)
        ? form[key].filter((v) => v !== value)
        : [...form[key], value],
    });
  const quick = useMemo(() => presets(data.today), [data.today]);
  const payload = (extra) => ({
    from: form.from,
    to: form.to,
    weekdays: form.weekdays,
    roomTypeIds: form.roomTypeIds,
    op: form.op,
    ...(op[2] ? { value: Number(form.value) } : {}),
    ...extra,
  });
  const preview = (event) => {
    event.preventDefault();
    setNotice('');
    startTransition(async () => setResult(await command(propertyId, payload({ preview: true }))));
  };
  const save = () =>
    startTransition(async () => {
      const saved = await command(
        propertyId,
        payload({ previewHash: result.previewHash, expectedVersion: result.version }),
      );
      if (saved.ok) onSaved();
      else if (saved.code === 'CALENDAR_CHANGED') {
        // Someone else changed these nights since the preview: show the fresh preview instead.
        setResult(await command(propertyId, payload({ preview: true })));
        setNotice('Prices changed since your preview — review again.');
      } else setResult(saved);
    });
  const roomName = (id) => data.roomTypes.find((r) => r.id === id)?.name ?? '';
  const errors = result?.error ? [result.error, ...Object.values(result.fields ?? {}).flat()] : [];
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink-900/40"
      role="presentation"
      onClick={requestClose}
    >
      <aside
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ari-drawer-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-full w-full max-w-md flex-col bg-card shadow-xl outline-none max-sm:mt-auto max-sm:h-[88dvh] max-sm:rounded-t-2xl"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 id="ari-drawer-title" className="text-h3">
            {data.canEditPrices ? 'Change rates or rooms' : 'Open or close rooms'}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-ink-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <form id="ari-form" onSubmit={preview} className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2" aria-label="Quick dates">
            {quick.map(([label, range]) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  set({
                    from: range.from,
                    to: range.to,
                    weekdays: range.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
                  })
                }
                className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-tiny font-semibold text-ink-700 hover:bg-brand-50"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-meta font-semibold">
              From
              <input
                type="date"
                required
                min={data.today}
                value={form.from}
                onChange={(e) => set({ from: e.target.value })}
                className={input}
              />
            </label>
            <label className="block text-meta font-semibold">
              To
              <input
                type="date"
                required
                min={form.from}
                value={form.to}
                onChange={(e) => set({ to: e.target.value })}
                className={input}
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-meta font-semibold">Nights of the week</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {WEEKDAYS.map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-border px-2 text-tiny font-semibold has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.weekdays.includes(value)}
                    onChange={() => toggle('weekdays', value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-meta font-semibold">Room types</legend>
            <div className="mt-1 space-y-1">
              {data.roomTypes.map((room) => (
                <label key={room.id} className="flex min-h-11 items-center gap-2 text-meta">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand-700"
                    checked={form.roomTypeIds.includes(room.id)}
                    onChange={() => toggle('roomTypeIds', room.id)}
                  />
                  {room.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-meta font-semibold">Change</legend>
            <div className="mt-1 space-y-1.5">
              {ops.map(([value, label, unit]) => (
                <label
                  key={value}
                  className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-meta has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
                >
                  <input
                    type="radio"
                    name="op"
                    className="size-4 accent-brand-700"
                    checked={form.op === value}
                    onChange={() => set({ op: value })}
                  />
                  <span className="flex-1">{label}</span>
                  {unit && form.op === value ? (
                    <input
                      type="number"
                      required
                      aria-label={unit}
                      placeholder={unit}
                      value={form.value}
                      onChange={(e) => set({ value: e.target.value })}
                      className={`${fieldClass} min-h-9 w-32`}
                    />
                  ) : null}
                </label>
              ))}
            </div>
          </fieldset>
          <div aria-live="polite">
            {errors.length ? (
              <ul
                role="alert"
                className="space-y-1 rounded-md border border-danger/30 bg-danger-bg p-3 text-meta text-danger"
              >
                {[...new Set(errors)].map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
            {notice ? (
              <p
                role="alert"
                className="mb-2 rounded-md border border-warning/40 bg-warning-bg p-3 text-meta"
              >
                {notice}
              </p>
            ) : null}
            {result?.preview ? (
              <div className="rounded-md border-2 border-ink-900 p-3 text-meta">
                <p>
                  This changes <strong>{result.cells}</strong> room-nights ({result.nights} night
                  {result.nights === 1 ? '' : 's'} × {result.roomTypes} room type
                  {result.roomTypes === 1 ? '' : 's'}). Existing bookings keep their price.
                </p>
                {result.changes?.length ? (
                  <table className="mt-2 w-full text-tiny tabular">
                    <caption className="sr-only">Prices before and after</caption>
                    <thead>
                      <tr className="text-left text-ink-600">
                        <th scope="col">Night</th>
                        <th scope="col">Room</th>
                        <th scope="col" className="text-right">
                          Now
                        </th>
                        <th scope="col" className="text-right">
                          New
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.changes.map((c) => (
                        <tr key={`${c.roomTypeId}:${c.night}`}>
                          <td>
                            {dayLabel(c.night, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </td>
                          <td>{roomName(c.roomTypeId)}</td>
                          <td className="text-right">{displayMoney(c.beforeMinor)}</td>
                          <td className="text-right font-semibold">{displayMoney(c.afterMinor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {result.changeCount > (result.changes?.length ?? 0) ? (
                  <p className="mt-1 text-tiny text-ink-600">
                    Showing the first {result.changes.length} of {result.changeCount}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </form>
        <footer className="flex justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={requestClose}
            className={buttonVariants({ variant: 'outline' })}
          >
            Cancel
          </button>
          {result?.preview ? (
            <button type="button" disabled={pending} onClick={save} className={button}>
              Apply to {result.cells} room-nights
            </button>
          ) : (
            <button
              type="submit"
              form="ari-form"
              disabled={pending || !form.weekdays.length || !form.roomTypeIds.length}
              className={button}
            >
              Preview
            </button>
          )}
        </footer>
        {confirming ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4"
            role="presentation"
            onClick={cancelConfirm}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="ari-discard-title"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                // Keep Tab inside the two buttons.
                if (event.key !== 'Tab') return;
                const buttons = [...event.currentTarget.querySelectorAll('button')];
                const at = buttons.indexOf(document.activeElement);
                event.preventDefault();
                buttons[(at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
              }}
              className="w-full max-w-xs rounded-lg bg-card p-4 shadow-xl"
            >
              <h3 id="ari-discard-title" className="font-semibold">
                Discard changes?
              </h3>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  ref={keepRef}
                  type="button"
                  onClick={cancelConfirm}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  Keep editing
                </button>
                <button type="button" onClick={onClose} className={button}>
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
