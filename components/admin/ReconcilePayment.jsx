'use client';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome, useKeptInputAction } from '@/components/booking/EvidenceForms';
import { reconcileAdminPayment } from '@/lib/actions/admin';

/** Re-fetch the provider's own record. The request key makes a repeat return the first result. */
export default function ReconcilePayment({ paymentId, requestKey }) {
  const { state, pending, onSubmit } = useKeptInputAction(reconcileAdminPayment);
  const [key] = useState(requestKey);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={paymentId} />
      <input type="hidden" name="requestKey" value={key} />
      <p className="text-meta text-ink-700">
        Asks Razorpay Test for its own record of this payment. Only a capture the provider verifies
        is recorded; nothing here marks a payment paid by hand, and an unconfirmed outcome stays
        pending.
      </p>
      <button
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded bg-brand-700 px-4 font-semibold text-white disabled:opacity-70"
      >
        {pending ? (
          <RentraLoader label="Checking with the provider…" />
        ) : (
          <>
            <RefreshCw className="size-4" aria-hidden="true" />
            Re-fetch from provider
          </>
        )}
      </button>
      <Outcome state={state} />
      {state.stateAfter ? (
        <p className="text-meta text-ink-700">
          Payment {state.stateBefore} → {state.stateAfter}
          {state.bookingStateAfter ? ` · booking ${state.bookingStateAfter}` : ''}
          {state.code ? ` · provider: ${state.code}` : ''}
          {state.replayed ? ' · repeat of an earlier request (no new provider call)' : ''}
        </p>
      ) : null}
    </form>
  );
}
