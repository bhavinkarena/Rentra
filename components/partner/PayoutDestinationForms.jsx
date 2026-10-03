'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useActionState, useId, useState, useTransition, useRef, useEffect } from 'react';
import { Landmark, ShieldCheck, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome, useKeptInputAction } from '@/components/booking/EvidenceForms';
import {
  changePayoutDestination,
  requestPayoutIdentity,
  confirmPayoutIdentity,
  submitPayoutDraft,
} from '@/lib/actions/partner';

const field = `${sharedFieldClass} mt-1 min-h-11`;
const primary = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
const secondary =
  'inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 font-semibold text-brand-700 disabled:opacity-70';

function Problem({ message, id }) {
  return message ? (
    <p id={id} role="alert" className="mt-1 text-meta font-medium text-danger">
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
  const [values, setValues] = useState({
    upiId: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    holderName: current?.holderName || '',
  });
  const [bankHint, setBankHint] = useState('');
  const lookup = useRef(0);
  const edit = (key) => (event) => {
    lookup.current++;
    setBankHint('');
    setValues((v) => ({ ...v, [key]: event.target.value }));
  };
  async function lookupIfsc() {
    const code = values.ifsc.replace(/[\s-]/g, '').toUpperCase(),
      attempt = ++lookup.current;
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) return;
    setBankHint('Looking up bank and branch…');
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${code}`, {
        signal: AbortSignal.timeout(5000),
      });
      const result = response.ok ? await response.json() : null;
      if (attempt === lookup.current)
        setBankHint(
          result?.BANK && result?.BRANCH
            ? `${result.BANK} · ${result.BRANCH}`
            : 'Check the IFSC on your bank statement. You can still save it.',
        );
    } catch {
      if (attempt === lookup.current)
        setBankHint(
          'Bank lookup is unavailable. You can still save the IFSC from your bank statement.',
        );
    }
  }
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
    <form noValidate onSubmit={onSubmit} onChange={() => setEdited(true)} className="space-y-4">
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
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 ${method === value ? 'border-brand-700 bg-brand-50' : 'border-border bg-card'}`}
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
            aria-label="UPI ID"
            aria-describedby={e.upiId ? `${id}-upi-error` : undefined}
            value={values.upiId}
            onChange={edit('upiId')}
            autoComplete="off"
            className={field}
            placeholder="yourname@bank"
            aria-invalid={Boolean(e.upiId)}
          />
          <Problem id={`${id}-upi-error`} message={e.upiId} />
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            Account number
            <input
              name="accountNumber"
              aria-label="Account number"
              value={values.accountNumber}
              onChange={edit('accountNumber')}
              inputMode="numeric"
              autoComplete="off"
              className={field}
              aria-describedby={`${id}-acct${e.accountNumber ? ` ${id}-acct-error` : ''}`}
              aria-invalid={Boolean(e.accountNumber)}
            />
            <span id={`${id}-acct`} className="mt-1 block text-meta text-ink-600">
              Checked, then discarded — Rentra keeps only the last four digits.
            </span>
            <Problem id={`${id}-acct-error`} message={e.accountNumber} />
          </label>
          <label className="block">
            Confirm account number
            <input
              name="confirmAccountNumber"
              aria-label="Confirm account number"
              aria-describedby={e.confirmAccountNumber ? `${id}-confirm-error` : undefined}
              value={values.confirmAccountNumber}
              onChange={edit('confirmAccountNumber')}
              inputMode="numeric"
              autoComplete="off"
              className={field}
              aria-invalid={Boolean(e.confirmAccountNumber)}
            />
            <Problem id={`${id}-confirm-error`} message={e.confirmAccountNumber} />
          </label>
          <label className="block">
            IFSC
            <input
              name="ifsc"
              aria-label="IFSC"
              aria-describedby={e.ifsc ? `${id}-ifsc-error` : undefined}
              value={values.ifsc}
              onChange={edit('ifsc')}
              onBlur={lookupIfsc}
              autoComplete="off"
              className={field}
              placeholder="SBIN0001234"
              aria-invalid={Boolean(e.ifsc)}
            />
            <Problem id={`${id}-ifsc-error`} message={e.ifsc} />
            <span role="status" className="mt-1 block text-meta text-ink-600">
              {bankHint}
            </span>
          </label>
        </div>
      )}
      <label className="block">
        Account holder name
        <input
          name="holderName"
          aria-label="Account holder name"
          aria-describedby={e.holderName ? `${id}-holder-error` : undefined}
          required
          className={field}
          value={values.holderName}
          onChange={edit('holderName')}
          aria-invalid={Boolean(e.holderName)}
        />
        <Problem id={`${id}-holder-error`} message={e.holderName} />
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
            <p className="font-semibold text-warning">
              Confirm your identity with a code to submit this change. A confirmation lasts{' '}
              {preview.recentAuthMinutes} minutes. Your details can be saved as a draft first.
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

export function ConfirmPayoutIdentityForm() {
  const router = useRouter();
  const [request, send, sending] = useActionState(requestPayoutIdentity, {});
  const [confirmation, confirm, confirming] = useActionState(confirmPayoutIdentity, {});
  useEffect(() => {
    if (confirmation.confirmed) router.refresh();
  }, [confirmation.confirmed, router]);
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Confirm your identity
      </h3>
      <p className="text-meta">
        We’ll send a code to your verified contact. You stay signed in and your draft stays here.
      </p>
      <form action={send}>
        <button disabled={sending} className={secondary}>
          {sending
            ? 'Sending code…'
            : request.challengeId
              ? 'Send another code'
              : 'Send confirmation code'}
        </button>
      </form>
      <Outcome state={request} />
      {request.challengeId && !confirmation.confirmed && (
        <form action={confirm} className="space-y-2">
          <input type="hidden" name="challengeId" value={request.challengeId} />
          <label className="block text-meta">
            Confirmation code
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              className={field}
            />
          </label>
          <button disabled={confirming} className={primary}>
            {confirming ? 'Confirming…' : 'Confirm identity'}
          </button>
        </form>
      )}
      <Outcome state={confirmation} />
    </div>
  );
}
