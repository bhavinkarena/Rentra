'use client';
import { useActionState, useState } from 'react';
import { newCalendarFeed, createOfflineBooking } from '@/lib/actions/partner';
export function CalendarFeed({ listingId }) {
  const [state, setState] = useState({}),
    [busy, setBusy] = useState(false);
  return (
    <section className="space-y-3 rounded-lg border bg-card p-5">
      <h2 className="text-h3">Calendar sync</h2>
      <p className="text-meta">
        Subscribe in Google Calendar or another calendar app. This secret link shares occupied times
        without guest contact or private notes.
      </p>
      <button
        className="min-h-11 rounded-md border px-4"
        disabled={busy}
        onClick={async () => {
          if (
            state.token &&
            !window.confirm('Regenerate the link? Calendars using the old link will stop updating.')
          )
            return;
          setBusy(true);
          try {
            setState(await newCalendarFeed(listingId));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Creating…' : state.token ? 'Regenerate secret link' : 'Create secret feed link'}
      </button>
      {state.token && (
        <label className="block">
          Secret subscription URL
          <input
            readOnly
            value={`${window.location.origin}/ical/${state.token}.ics`}
            onFocus={(e) => e.target.select()}
            className="mt-1 w-full rounded-md border p-3"
          />
        </label>
      )}
      {state.error && <p role="alert">{state.error}</p>}
    </section>
  );
}
export function OfflineBooking({ property, date }) {
  const [state, action, pending] = useActionState(
    async (previous, form) =>
      createOfflineBooking(property.id, {
        date: String(form.get('date')),
        slot: String(form.get('slot')),
        name: String(form.get('name')),
        phone: String(form.get('phone') || ''),
        guests: Number(form.get('guests')),
        collectedMinor: Math.round(Number(form.get('collected') || 0) * 100),
        note: String(form.get('note') || ''),
      }),
    {},
  );
  return (
    <details className="rounded-lg border p-3">
      <summary className="min-h-11 cursor-pointer font-semibold">Add offline booking</summary>
      <form action={action} className="space-y-3">
        <p className="text-meta">
          Phone or WhatsApp booking, outside Rentra. This blocks inventory and never enters Rentra
          earnings.
        </p>
        <label className="block">
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={date}
            className="block min-h-11 rounded-md border p-2"
          />
        </label>
        <label className="block">
          Slot
          <select name="slot" className="block min-h-11 rounded-md border p-2">
            {['day', 'night', 'full_day']
              .filter((s) => property.config?.slots?.[s]?.enabled)
              .map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
          </select>
        </label>
        {[
          ['name', 'Guest name', 'text', true],
          ['phone', 'Phone (optional)', 'tel', false],
          ['guests', 'Number of guests', 'number', true],
          ['collected', 'Amount collected (₹, optional)', 'number', false],
        ].map(([name, label, type, required]) => (
          <label key={name} className="block">
            {label}
            <input
              name={name}
              type={type}
              required={required}
              min={name === 'guests' ? 1 : 0}
              maxLength={name === 'name' ? 100 : name === 'phone' ? 20 : undefined}
              className="block min-h-11 w-full rounded-md border p-2"
            />
          </label>
        ))}
        <label className="block">
          Note (optional)
          <textarea name="note" maxLength={500} className="block w-full rounded-md border p-2" />
        </label>
        <button disabled={pending} className="min-h-11 rounded-md bg-primary px-4 text-white">
          {pending ? 'Saving…' : 'Add offline booking'}
        </button>
        {state.error && <p role="alert">{state.error}</p>}
        {state.ok && <p role="status">Offline booking added.</p>}
      </form>
    </details>
  );
}
