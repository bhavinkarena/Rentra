'use client';
import { useActionState, useId, useState, useTransition } from 'react';
import { Landmark, LogIn, Smartphone } from 'lucide-react';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome, useKeptInputAction } from '@/components/booking/EvidenceForms';
import {
  changePayoutDestination,
  signInAgainForPayout,
  submitPayoutDraft,
} from '@/lib/actions/partner';

const field = 'mt-1 block min-h-11 w-full rounded border border-border bg-card p-2';
const primary =
  'inline-flex min-h-11 items-center gap-2 rounded bg-brand-700 px-4 font-semibold text-white disabled:opacity-70';
const secondary =
  'inline-flex min-h-11 items-center gap-2 rounded border border-border bg-card px-4 font-semibold text-brand-700 disabled:opacity-70';

function Problem({ message }) {
  return message ? (
    <p role="alert" className="mt-1 text-tiny font-medium text-danger">
      {message}
    </p>
  ) : null;
}

/**
 * Preview first, then submit with the same request key. Editing after a
 * preview clears it, so what is submitted is always what was previewed.
 */
export function ChangeDestinationForm({ latestVersion, requestKey, current }) {
  const [state, dispatch, pending] = useActionState(changePayoutDestination, {});
  const [, startTransition] = useTransition();
  const [method, setMethod] = useState(current?.method ?? 'upi');
  const [edited, setEdited] = useState(false);
  const [key] = useState(requestKey);
  const id = useId();
  const e = state.errors ?? {};
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
    data.set('mode', preview ? 'submit' : 'preview');
    setEdited(false);
    startTransition(() => dispatch(data));
  };
  return (
    <form onSubmit={onSubmit} onChange={() => setEdited(true)} className="space-y-4">
      <input type="hidden" name="expectedLatest" value={latestVersion} />
      <input type="hidden" name="requestKey" value={key} />
      <fieldset>
        <legend className="font-medium">Payout method</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ['upi', 'UPI', Smartphone],
            ['bank', 'Bank account', Landmark],
          ].map(([value, label, Icon]) => (
            <label
              key={value}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 ${method === value ? 'border-brand-700 bg-brand-50' : 'border-border bg-card'}`}
            >
              <input
                type="radio"
                name="method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
                className="size-4"
              />
              <Icon className="size-4" aria-hidden="true" /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      {method === 'upi' ? (
        <label className="block">
          UPI ID
          <input
            name="upiId"
            autoComplete="off"
            className={field}
            placeholder="yourname@bank"
            aria-invalid={Boolean(e.upiId)}
          />
          <Problem message={e.upiId} />
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            Account number
            <input
              name="accountNumber"
              inputMode="numeric"
              autoComplete="off"
              className={field}
              aria-describedby={`${id}-acct`}
              aria-invalid={Boolean(e.accountNumber)}
            />
            <span id={`${id}-acct`} className="mt-1 block text-tiny text-ink-600">
              Checked, then discarded — Rentra keeps only the last four digits.
            </span>
            <Problem message={e.accountNumber} />
          </label>
          <label className="block">
            IFSC
            <input
              name="ifsc"
              autoComplete="off"
              className={field}
              placeholder="SBIN0001234"
              aria-invalid={Boolean(e.ifsc)}
            />
            <Problem message={e.ifsc} />
          </label>
        </div>
      )}
      <label className="block">
        Account holder name
        <input
          name="holderName"
          required
          className={field}
          defaultValue={current?.holderName ?? ''}
          aria-invalid={Boolean(e.holderName)}
        />
        <Problem message={e.holderName} />
      </label>
      {preview ? (
        <section
          role="status"
          aria-label="Payout change preview"
          className="space-y-1.5 rounded-md border border-brand-300 bg-brand-50 p-3 text-meta"
        >
          <h3 className="font-semibold">Review before submitting — nothing has changed yet</h3>
          <p>
            Version {preview.version}: <strong>{preview.masked}</strong> · {preview.holderName}
          </p>
          {preview.replaces ? (
            <p>
              Replaces version {preview.replaces.version} ({preview.replaces.masked}).
            </p>
          ) : null}
          <p>{preview.effect}</p>
          <p>
            Name comparison with your ID:{' '}
            {preview.nameCheck === 'same'
              ? 'same name'
              : preview.nameCheck === 'different'
                ? 'different name — Rentra will review it'
                : 'not compared'}{' '}
            (a comparison, not bank verification).
          </p>
          {preview.needsRecentAuth ? (
            <p className="font-semibold text-amber-800">
              You signed in more than 15 minutes ago, so this will be saved as a draft until you
              sign in again.
            </p>
          ) : null}
        </section>
      ) : null}
      <button disabled={pending} className={primary}>
        {pending ? (
          <RentraLoader label="Checking…" />
        ) : preview ? (
          preview.needsRecentAuth ? (
            'Save as draft'
          ) : (
            `Submit version ${preview.version}`
          )
        ) : (
          'Preview change'
        )}
      </button>
      <Outcome state={state.preview ? {} : state} />
    </form>
  );
}

export function SubmitDraftForm({ draft, latestVersion }) {
  const { state, pending, onSubmit } = useKeptInputAction(submitPayoutDraft);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="draftId" value={draft.id} />
      <input type="hidden" name="expectedLatest" value={latestVersion} />
      <button disabled={pending} className={primary}>
        {pending ? <RentraLoader label="Submitting…" /> : `Submit draft version ${draft.version}`}
      </button>
      <Outcome state={state} />
    </form>
  );
}

export function SignInAgain() {
  const [, action, pending] = useActionState(signInAgainForPayout, {});
  return (
    <form action={action}>
      <button disabled={pending} className={secondary}>
        <LogIn className="size-4" aria-hidden="true" />{' '}
        {pending ? 'Signing out…' : 'Sign in again to confirm'}
      </button>
    </form>
  );
}
