'use client';
import { useActionState, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fieldClass } from '@/components/ui/field';
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
  const label = 'block text-tiny font-semibold text-ink-600';
  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-meta font-semibold text-ink-900">Add offline booking</span>
          <span className="block text-tiny text-ink-500">Phone or WhatsApp guests</span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-ink-500 transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <form action={action} className="space-y-4 border-t border-border p-4">
        <p className="text-meta text-ink-600">
          A booking made outside Rentra. It blocks the date and never enters Rentra earnings.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue={date}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <label className={label}>
            Slot
            <select name="slot" className={`${fieldClass} mt-1.5`}>
              {['day', 'night', 'full_day']
                .filter((s) => property.config?.slots?.[s]?.enabled)
                .map((s) => (
                  <option key={s} value={s}>
                    {{ day: 'Day picnic', night: 'Night stay', full_day: 'Full day' }[s]}
                  </option>
                ))}
            </select>
          </label>
          {[
            ['name', 'Guest name', 'text', true, 'col-span-2'],
            ['phone', 'Phone (optional)', 'tel', false, ''],
            ['guests', 'Guests', 'number', true, ''],
            ['collected', 'Amount collected (₹, optional)', 'number', false, 'col-span-2'],
          ].map(([name, text, type, required, span]) => (
            <label key={name} className={`${label} ${span}`}>
              {text}
              <input
                name={name}
                type={type}
                required={required}
                min={name === 'guests' ? 1 : 0}
                maxLength={name === 'name' ? 100 : name === 'phone' ? 20 : undefined}
                inputMode={type === 'number' ? 'numeric' : undefined}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
          ))}
          <label className={`${label} col-span-2`}>
            Note (optional)
            <textarea
              name="note"
              maxLength={500}
              rows={2}
              className={`${fieldClass} mt-1.5 py-2`}
            />
          </label>
        </div>
        <button
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-meta font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Add offline booking'}
        </button>
        {state.error && (
          <p role="alert" className="text-meta text-danger">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="text-meta font-semibold text-success">
            Offline booking added.
          </p>
        )}
      </form>
    </details>
  );
}
