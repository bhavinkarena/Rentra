'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { hotelFinanceCommand } from '@/lib/actions/hotel-finance';
import { control } from './PropertyCommandForm';
import { adminDateTime } from '@/lib/domain/admin-display';

export default function PayoutModePanel({ data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [review, setReview] = useState(null);
  const [result, setResult] = useState(null);
  const send = (input) =>
    startTransition(async () => {
      try {
        const outcome = await hotelFinanceCommand('payoutMode', input);
        setResult(outcome);
        if (outcome.preview) setReview({ ...outcome, input });
        if (outcome.ok || outcome.code === 'STALE_PREVIEW') {
          setReview(null);
          router.refresh();
        }
      } catch {
        setResult({
          error:
            'Unable to confirm the outcome. Reload and review the current setting before trying again.',
        });
        setReview(null);
      }
    });
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-h1 font-semibold">Payout mode</h1>
        <p className="mt-2 text-meta">
          Global mode: {data.effective.mode}. An owner override applies to every property of that
          owner. Clearing it inherits the current global mode.
        </p>
        <p className="mt-2 text-meta">{data.gate}</p>
      </header>
      {!data.canWrite && (
        <p role="status">Read only. Finance write permission is required to change payout modes.</p>
      )}
      <form
        className="space-y-4 rounded-lg border border-border bg-card p-5"
        onChange={() => {
          setReview(null);
          setResult(null);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          send({ ...Object.fromEntries(new FormData(event.currentTarget)), preview: true });
        }}
      >
        <fieldset disabled={pending || !data.canWrite} className="space-y-4">
          <label className="block text-meta font-semibold">
            Owner email (empty for global)
            <input name="ownerEmail" type="email" className={control} />
          </label>
          <label className="block text-meta font-semibold">
            Proposed mode
            <select name="mode" className={control}>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="inherit">Inherit global (owner only)</option>
            </select>
          </label>
          <label className="block text-meta font-semibold">
            Reason
            <input name="reason" required minLength={4} maxLength={500} className={control} />
          </label>
          <button disabled={pending} className="min-h-11 rounded-md bg-primary px-4 text-white">
            Review change
          </button>
        </fieldset>
      </form>
      {review && (
        <form
          className="space-y-4 rounded-lg border border-border p-5"
          onSubmit={(event) => {
            event.preventDefault();
            send({
              ...review.input,
              preview: false,
              previewHash: review.previewHash,
              accepted: true,
            });
          }}
        >
          <p>
            {review.ownerEmail || 'Global'}: current {review.current.mode} ({review.current.source}
            ); proposed {review.proposed} (
            {review.mode === 'inherit'
              ? 'global inheritance'
              : review.ownerId
                ? 'owner override'
                : 'global'}
            ).
          </p>
          <p>
            Reason: {review.reason}. Existing payouts and pinned destinations stay unchanged. Both
            modes use the same accounting eligibility.
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" required disabled={pending} />I confirm this immediate
            configuration change. It sends no money.
          </label>
          <button
            disabled={pending || !data.canWrite}
            className="min-h-11 rounded-md bg-primary px-4 text-white"
          >
            Confirm mode
          </button>
        </form>
      )}
      {result?.error && <p role="alert">{Object.values(result.fields ?? {})[0] ?? result.error}</p>}
      {result?.ok && (
        <p role="status">
          Saved. Effective mode: {result.effective.mode} ({result.effective.source}).
        </p>
      )}
      <section className="rounded-lg border border-border p-5">
        <h2 className="text-h3">History</h2>
        <ul className="divide-y divide-border">
          {data.settings.map((row) => (
            <li key={row.id} className="py-3 text-meta">
              <strong>
                {row.ownerEmail ?? 'Global'}: {row.mode ?? 'Inherit global'}
              </strong>
              <p>
                {row.reason} · {adminDateTime(row.createdAt)}
                {row.createdBy ? ` · ${row.createdBy}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
