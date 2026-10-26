'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { hotelFinanceCommand } from '@/lib/actions/hotel-finance';
import { adminDateTime } from '@/lib/domain/admin-display';
import { control } from '@/components/admin/PropertyCommandForm';

const percent = (bps) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`;

/**
 * Story 2.2: the one guest-paid Rentra service fee. A global rate, or an
 * owner-wide override that replaces it. Changes are new history rows with a
 * reason; they never reprice accepted bookings.
 */
export default function ServiceFeePanel({ data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const latestFor = (email) => ({ id: data.latest?.[email?.trim().toLowerCase() || 'global'] });
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-h1 font-semibold">Rentra service fee</h1>
        <p className="mt-2 text-meta text-ink-600">
          Guests pay one service fee on rent and paid extras before tax, included in the quoted
          total. Global rate now: <strong>{percent(data.globalBps)}</strong>. An owner override
          replaces it for every property of that owner. There are no category or property rates.
        </p>
      </header>
      <form
        className="space-y-4 rounded-lg border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = Object.fromEntries(new FormData(event.currentTarget));
          form.expectedSettingId = latestFor(form.ownerEmail)?.id ?? '';
          if (form.effectiveAt)
            form.effectiveAt = new Date(`${form.effectiveAt}:00+05:30`).toISOString();
          startTransition(async () => {
            const outcome = await hotelFinanceCommand('serviceFee', form);
            setResult(outcome);
            if (outcome.ok) router.refresh();
          });
        }}
      >
        <h2 className="text-h3 font-semibold">Change a rate</h2>
        <label className="block text-meta font-semibold">
          Owner email (leave empty for the global rate)
          <input
            name="ownerEmail"
            type="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            className={control}
          />
        </label>
        <label className="block text-meta font-semibold">
          Rate (%)
          <input
            name="ratePercent"
            type="number"
            min="0"
            max="30"
            step="0.01"
            required
            className={control}
          />
        </label>
        <label className="block text-meta font-semibold">
          Takes effect (India time; leave empty for now)
          <input name="effectiveAt" type="datetime-local" className={control} />
        </label>
        <label className="block text-meta font-semibold">
          Reason (kept in the audit history)
          <input name="reason" required minLength={4} maxLength={500} className={control} />
        </label>
        {result?.error ? (
          <p role="alert" className="text-meta text-danger">
            {Object.values(result.fields ?? {})[0] ?? result.error}
          </p>
        ) : null}
        {result?.ok ? (
          <p role="status" className="text-meta text-brand-900">
            Saved: {percent(result.rateBps)} from {adminDateTime(result.effectiveAt)}. Accepted
            bookings keep their fee.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-primary px-4 text-meta font-semibold text-white disabled:opacity-60"
        >
          Save rate
        </button>
      </form>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-h3 font-semibold">History</h2>
        <ul className="mt-3 divide-y divide-border text-meta">
          {data.settings.map((s) => (
            <li key={s.id} className="py-3">
              <strong>
                {s.ownerEmail ?? 'Global'} · {percent(s.rateBps)}
              </strong>
              <p className="text-ink-600">
                From {adminDateTime(s.effectiveAt)} · {s.reason}
                {s.createdBy ? ` · ${s.createdBy}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
