'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState, useState } from 'react';
import { bookAgain } from '@/lib/actions/customer';
import { Plus } from 'lucide-react';
import { SLOTS } from '@/lib/domain/pricing';
import { recordOwnerVisit } from '@/lib/actions/partner';
import { recordAdminVisit } from '@/lib/actions/admin';
import { Outcome, PhotoField, useKeptInputAction } from '@/components/booking/EvidenceForms';

export function VisitLifecycle({
  visit,
  requestKey,
  admin = false,
  action = null,
  sticky = false,
}) {
  const phase = visit.operation
    ? visit.operation.action
    : { confirmed: 'handover', handed_over: 'return', returned: 'complete' }[visit.state];
  // `action` lets another operator (a CP16 caretaker) reuse the same kept-input form.
  const { state, pending, onSubmit } = useKeptInputAction(
    action ?? (admin ? recordAdminVisit : recordOwnerVisit),
  );
  const [key] = useState(requestKey);
  const [observedAt] = useState(() =>
    new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16),
  );
  if (!phase || !visit.startsAt) return null;
  return (
    <details open className="mt-4 rounded-md border border-border p-3">
      <summary className="cursor-pointer font-semibold">
        {phase === 'handover'
          ? 'Guest arrived'
          : phase === 'return'
            ? 'Guest left'
            : 'Everything OK?'}
      </summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input type="hidden" name="visitId" value={visit.id} />
        <input type="hidden" name="phase" value={phase} />
        <input type="hidden" name="version" value={visit.version} />
        <input type="hidden" name="requestKey" value={key} />
        <p>
          {visit.provenance === 'real'
            ? 'Record what actually occurred. This attestation is kept for review eligibility and operations.'
            : 'Test / simulation visit: these operations do not establish a real visit or make it eligible for public reviews.'}
        </p>
        <label className="block">
          When it occurred (India time)
          <input
            required
            type="datetime-local"
            name="occurredAt"
            defaultValue={observedAt}
            className="mt-1 block min-h-11 w-full rounded-md border border-input p-2 text-base md:text-sm bg-card text-foreground"
          />
        </label>
        <label className="block">
          Note (optional)
          <textarea
            maxLength={1000}
            name="note"
            className="mt-1 block w-full rounded-md border border-input p-2 text-base md:text-sm bg-card text-foreground"
            placeholder="Describe the guest handover, return inspection or completion check. Do not include IDs, access codes or payment details."
          />
        </label>
        <PhotoField error={state.errors?.photos} />
        <input type="hidden" name="attested" value="on" />
        <button
          data-mobile-actions={sticky || undefined}
          disabled={pending}
          className={`min-h-11 rounded-md bg-primary px-4 text-white ${sticky ? 'owner-visit-action fixed inset-x-4 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 shadow-md md:static md:shadow-none' : ''}`}
        >
          {pending ? (
            <RentraLoader label="Recording…" />
          ) : phase === 'handover' ? (
            'Record check-in'
          ) : phase === 'return' ? (
            'Record check-out'
          ) : (
            'Yes, complete'
          )}
        </button>
        <Outcome state={state} />
      </form>
    </details>
  );
}

// Customer-only form (book the same place again).
const field = `${sharedFieldClass} mt-1 min-h-11`;
export function BookAgainForm({ record }) {
  const [state, action, pending] = useActionState(bookAgain, {});
  const [dates, setDates] = useState(['']);
  return (
    <form action={action} className="space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6">
      <input type="hidden" name="orderId" value={record.id} />
      <p className="text-meta text-ink-600">
        Choose new dates. We will check current availability, hours, capacity, prices and terms
        before you review another booking.
      </p>
      {dates.map((date, i) => (
        <div key={i} className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-meta font-medium">
            Visit date {i + 1}
            <input
              className={field}
              required
              type="date"
              name="date"
              value={date}
              onChange={(e) => setDates(dates.map((v, n) => (n === i ? e.target.value : v)))}
            />
          </label>
          {dates.length > 1 ? (
            <button
              type="button"
              className="min-h-11 rounded-full px-3 text-meta font-semibold text-ink-600 hover:bg-ink-50"
              onClick={() => setDates(dates.filter((_, n) => i !== n))}
            >
              Remove date {i + 1}
            </button>
          ) : null}
        </div>
      ))}
      {dates.length < 10 ? (
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-meta font-semibold text-brand-700 hover:bg-brand-50"
          type="button"
          onClick={() => setDates([...dates, ''])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add another date
        </button>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-meta font-medium">
          Visit type
          <select className={field} name="slot" defaultValue={record.visits[0]?.slot || 'day'}>
            {Object.values(SLOTS).map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-meta font-medium">
          Guests
          <input
            className={field}
            name="guests"
            type="number"
            min={1}
            max={500}
            defaultValue={record.visits[0]?.guests || 1}
            required
          />
        </label>
      </div>
      <button
        disabled={pending}
        className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground active:bg-primary-active"
      >
        {pending ? <RentraLoader label="Checking…" /> : 'Check new dates and prices'}
      </button>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger-bg p-3 text-meta">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
