'use client';
import PolicyValues from './PolicyValues';
import { useActionState, useState, useTransition } from 'react';

export function usePolicyAction(action) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [edited, setEdited] = useState(false);
  const [, startTransition] = useTransition();
  const preview = edited ? null : state.preview;
  return {
    state,
    pending,
    preview,
    form: {
      onChange: () => setEdited(true),
      onSubmit: (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        data.set('mode', preview ? 'apply' : 'preview');
        if (preview) data.set('previewToken', preview.token);
        setEdited(false);
        startTransition(() => dispatch(data));
      },
    },
  };
}
const label = (key) =>
  ({
    day_weekday: 'Day weekday rent',
    day_weekend: 'Day weekend rent',
    night_weekday: 'Night weekday rent',
    night_weekend: 'Night weekend rent',
    full_day_weekday: 'Full day weekday rent',
    full_day_weekend: 'Full day weekend rent',
    extraGuestCharge: 'Extra guest charge',
    depositAmount: 'Separate deposit estimate',
    cancellationTier: 'Cancellation tier',
  })[key] || key;
export function PolicyPreview({ preview, state }) {
  return (
    <>
      {preview && (
        <section
          role="status"
          aria-label="Policy change preview"
          className="space-y-2 rounded-md border border-brand-300 bg-brand-50 p-4"
        >
          <h3 className="font-semibold">Review before applying</h3>
          <p>{preview.effective}</p>
          <details>
            <summary className="min-h-11 cursor-pointer">Current values</summary>
            <PolicyValues values={preview.before} />
          </details>
          <ul>
            {Object.entries(preview.after)
              .filter(([key]) => key !== 'extraHourCharge')
              .map(([key, value]) => (
                <li key={key}>
                  {label(key)}: {typeof value === 'number' ? `₹${value}` : value}
                </li>
              ))}
          </ul>
          <p>Nothing has been saved. Submit again to confirm these values.</p>
        </section>
      )}
      {state.effectiveVersion && (
        <p role="status">
          Effective booking version {state.effectiveVersion} · Applies now to new quotes.
        </p>
      )}
    </>
  );
}
export function PolicyHistory({ listing }) {
  return (
    <details className="rounded-md border border-border p-4">
      <summary className="min-h-11 cursor-pointer font-semibold">
        Pricing and policy history
      </summary>
      <p className="text-sm">
        Current content version {listing.contentVersion}. Changes apply immediately to new quotes;
        accepted bookings keep their snapshot.
      </p>
      <ol className="mt-3 space-y-3">
        {(listing.policyHistory || []).map((entry, index) => (
          <li key={index} className="text-sm">
            <p>
              {entry.action.replaceAll('_', ' ')} ·{' '}
              {new Date(entry.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} India
              {entry.effectiveVersion ? ` · Version ${entry.effectiveVersion}` : ''}
            </p>
            <details>
              <summary className="min-h-11 cursor-pointer">Recorded values</summary>
              <PolicyValues values={entry.values} />
            </details>
          </li>
        ))}
      </ol>
      {!listing.policyHistory?.length && <p>No recorded pricing or policy changes yet.</p>}
    </details>
  );
}
