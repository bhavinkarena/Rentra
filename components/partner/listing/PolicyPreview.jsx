'use client';
import OwnerTable from '../OwnerTable';
import { EmptyState } from '@/components/ui/empty-state';
import PolicyValues from './PolicyValues';
import { useActionState, useState, useTransition } from 'react';

export function usePolicyAction(action, listing) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [edited, setEdited] = useState(false);
  const [, startTransition] = useTransition();
  const preview = edited ? null : state.preview;
  return {
    state,
    pending,
    preview,
    invalidatePreview: () => setEdited(true),
    form: {
      'data-unsaved-until-saved': '',
      onChange: () => setEdited(true),
      onSubmit: (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (['draft', 'rejected'].includes(listing?.status) && !listing?.hasBookings)
          data.set('direct', 'true');
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
const POLICY_ACTION = {
  property_pricing_changed: 'Prices changed',
  property_terms_changed: 'Deposit or cancellation changed',
  property_hourly_rates_changed: 'Hourly prices changed',
  booking_configuration_changed: 'Booking hours changed',
};

/** Pricing and policy changes in plain words (Activity tab). */
export function PolicyHistory({ listing }) {
  const entries = listing.policyHistory || [];
  return (
    <div>
      <p className="text-meta text-ink-600">
        Changes apply to new bookings straight away. Bookings already made keep the price and terms
        the guest accepted.
      </p>
      {entries.length ? (
        <OwnerTable
          label="Price and policy history"
          columns={['Change', 'Date (IST)', 'Details']}
          minWidth={500}
        >
          {entries.map((entry, index) => (
            <tr key={index}>
              <td className="font-semibold">
                {POLICY_ACTION[entry.action] ?? entry.action.replaceAll('_', ' ')}
              </td>
              <td className="whitespace-nowrap">
                {new Date(entry.at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </td>
              <td>
                <details>
                  <summary className="min-h-11 cursor-pointer content-center font-semibold text-brand-800">
                    What was saved
                  </summary>
                  <PolicyValues values={entry.values} />
                </details>
              </td>
            </tr>
          ))}
        </OwnerTable>
      ) : (
        <EmptyState
          variant="compact"
          title="No price or policy changes yet"
          description="Saved pricing and policy changes appear here."
        />
      )}
    </div>
  );
}
