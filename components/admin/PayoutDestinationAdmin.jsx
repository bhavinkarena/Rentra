'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { useActionState, useId, useState, useTransition } from 'react';
import { ShieldX } from 'lucide-react';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome } from '@/components/booking/EvidenceForms';
import { failPayoutDestination, signInAgainAsAdmin } from '@/lib/actions/admin';

const field = `${sharedFieldClass} mt-1 min-h-11`;

/**
 * Mark a destination failed: preview the effect first, then confirm with the
 * same request key. Needs a recent admin sign-in. There is no "verify" here.
 */
export function FailDestinationForm({ clientId, destination, requestKey }) {
  const [state, dispatch, pending] = useActionState(failPayoutDestination, {});
  const [, startTransition] = useTransition();
  const [edited, setEdited] = useState(false);
  const [key] = useState(requestKey);
  const id = useId();
  // Keep the last preview through a failed submit so a retry reuses it (and its request key).
  const [kept, setKept] = useState(null);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.preview) setKept(state.preview);
    else if (!state.error && !state.errors) setKept(null);
  }
  const preview = !edited ? kept : null;
  const onSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set('mode', preview ? 'apply' : 'preview');
    setEdited(false);
    startTransition(() => dispatch(data));
  };
  const reauth = state.code === 'REAUTH_REQUIRED';
  return (
    <details className="rounded-md border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <ShieldX className="size-4 text-danger" aria-hidden="true" /> Mark version{' '}
        {destination.version} failed
      </summary>
      <form
        onSubmit={onSubmit}
        onChange={() => setEdited(true)}
        className="mt-3 space-y-3 text-meta"
      >
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="destinationId" value={destination.id} />
        <input type="hidden" name="expectedState" value={destination.state} />
        <input type="hidden" name="requestKey" value={key} />
        <p className="text-ink-700">
          Use when the destination cannot receive the owner&apos;s money (for example the bank
          reports it closed or not in the owner&apos;s name). Payouts pinned to it cannot be sent
          and the owner is asked for a new destination.
        </p>
        <label className="block" htmlFor={`${id}-reason`}>
          Reason (shown to the owner)
        </label>
        <textarea
          id={`${id}-reason`}
          name="reason"
          required
          minLength={10}
          maxLength={500}
          className={field}
          aria-invalid={Boolean(state.errors?.reason)}
        />
        {state.errors?.reason ? (
          <p role="alert" className="text-tiny text-danger">
            {state.errors.reason}
          </p>
        ) : null}
        {preview ? (
          <section
            role="status"
            aria-label="Failure impact preview"
            className="space-y-1 rounded-md border border-danger/30 bg-danger-bg p-3"
          >
            <p className="font-semibold">Review before confirming — nothing has changed yet</p>
            <p>
              Version {preview.version} · {preview.masked} ({preview.state})
            </p>
            <p>{preview.effect}</p>
            {preview.needsRecentAuth ? (
              <p className="font-semibold">
                Your sign-in is older than 15 minutes; sign in again before confirming.
              </p>
            ) : null}
          </section>
        ) : null}
        <button
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-danger px-4 font-semibold text-white disabled:opacity-70"
        >
          {pending ? (
            <RentraLoader label="Checking…" />
          ) : preview ? (
            'Confirm: mark failed'
          ) : (
            'Preview impact'
          )}
        </button>
        <Outcome state={state.preview ? {} : state} />
      </form>
      {reauth ? (
        <form action={signInAgainAsAdmin} className="mt-2">
          <button className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-semibold text-brand-700">
            Sign in again
          </button>
        </form>
      ) : null}
    </details>
  );
}
