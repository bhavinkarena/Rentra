'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState, useState } from 'react';
import { bookAgain } from '@/lib/actions/customer';
import { recordOwnerVisit } from '@/lib/actions/partner';
import { recordAdminVisit } from '@/lib/actions/admin';

export function VisitLifecycle({ visit, requestKey, admin = false }) {
  const phase = { confirmed: 'handover', handed_over: 'return', returned: 'complete' }[visit.state];
  const [state, action, pending] = useActionState(admin ? recordAdminVisit : recordOwnerVisit, {});
  const [key] = useState(requestKey);
  if (!phase || !visit.startsAt) return null;
  return (
    <details className="mt-4 rounded-md border border-border p-3">
      <summary className="cursor-pointer font-semibold">Record {phase} evidence</summary>
      <form action={action} className="mt-3 space-y-3">
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
            className="mt-1 block min-h-11 w-full rounded border border-border p-2"
          />
        </label>
        <label className="block">
          Evidence: what you observed
          <textarea
            required
            minLength={20}
            maxLength={1000}
            name="note"
            className="mt-1 block w-full rounded border border-border p-2"
            placeholder="Describe the guest handover, return inspection or completion check. Do not include IDs, access codes or payment details."
          />
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="attested" required className="mt-1 size-5" />I confirm this
          observation and its time. A scheduled date alone is not evidence.
        </label>
        <button disabled={pending} className="min-h-11 rounded bg-brand-700 px-4 text-white">
          {pending ? <RentraLoader label="Recording…" /> : `Record ${phase}`}
        </button>
        {state.error ? <p role="alert">{state.error}</p> : null}
        {state.message ? <p role="status">{state.message}</p> : null}
      </form>
    </details>
  );
}

export function BookAgainForm({ record }) {
  const [state, action, pending] = useActionState(bookAgain, {});
  const [dates, setDates] = useState(['']);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={record.id} />
      <p>
        Choose new dates. We will check current availability, hours, capacity, prices and terms
        before you review another booking.
      </p>
      {dates.map((date, i) => (
        <div key={i} className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            Visit date {i + 1}
            <input
              className="block min-h-11 w-full rounded border border-border p-2"
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
              className="min-h-11 underline"
              onClick={() => setDates(dates.filter((_, n) => i !== n))}
            >
              Remove date {i + 1}
            </button>
          ) : null}
        </div>
      ))}
      {dates.length < 10 ? (
        <button
          className="min-h-11 underline"
          type="button"
          onClick={() => setDates([...dates, ''])}
        >
          Add another date
        </button>
      ) : null}
      <label className="block">
        Visit type
        <select
          className="block min-h-11 rounded border border-border p-2"
          name="slot"
          defaultValue={record.visits[0]?.slot || 'day'}
        >
          <option value="day">Day</option>
          <option value="night">Night</option>
          <option value="full_day">Full day</option>
        </select>
      </label>
      <label className="block">
        Guests
        <input
          className="block min-h-11 rounded border border-border p-2"
          name="guests"
          type="number"
          min={1}
          max={500}
          defaultValue={record.visits[0]?.guests || 1}
          required
        />
      </label>
      <button disabled={pending} className="min-h-11 rounded bg-brand-700 px-4 text-white">
        {pending ? <RentraLoader label="Checking…" /> : 'Check new dates and prices'}
      </button>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
