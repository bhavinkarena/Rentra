'use client';

import { useActionState, useRef, useState } from 'react';
import LoaderCircle from '@/components/ui/rentra-loader';
import RetryButton from '@/components/portal/RetryButton';
import ValidationSummary from '@/components/portal/ValidationSummary';
import { customerAccountCommand } from '@/lib/actions/admin';

const CONFLICTS = ['ACCOUNT_CONFLICT', 'PROFILE_CONFLICT', 'LIFECYCLE_NOT_ALLOWED'];
const inputCls = 'mt-1 block min-h-10 w-full rounded-md border border-input bg-card px-3 text-meta';

function Failure({ state }) {
  if (!state.error || (state.errors && !state.errors._)) return null;
  return (
    <div
      role="alert"
      className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger"
    >
      <p>{state.errors?._ ?? state.error}</p>
      {CONFLICTS.includes(state.code) ? (
        <div className="mt-3">
          <RetryButton label="Reload current details" />
        </div>
      ) : null}
    </div>
  );
}

function Reason({ id, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id} className="block text-meta font-semibold text-ink-700">
        Reason (kept in the audit history)
      </label>
      <textarea
        id={id}
        name="reason"
        required
        minLength={4}
        maxLength={1000}
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-meta"
      />
      {error ? <p className="mt-1 text-tiny font-medium text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * Permitted identity corrections. Inputs are controlled so a rejected save
 * (duplicate email, stale version) keeps what the operator typed.
 */
export function CustomerProfileCorrection({ customer }) {
  const [state, action, pending] = useActionState(customerAccountCommand, {});
  const formRef = useRef(null);
  const [values, setValues] = useState({
    name: customer.name ?? '',
    email: customer.email ?? '',
    preferredLocale: customer.preferredLocale ?? 'en',
    reason: '',
  });
  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const e = state.errors ?? {};

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-3 border-t border-border pt-4">
      <h3 className="text-meta font-bold text-ink-900">Correct identity details</h3>
      <p className="text-tiny text-ink-500">
        The phone number is the sign-in credential and cannot be edited here; it changes only
        through the customer&apos;s verified phone-change flow. A changed email needs verification
        again.
      </p>
      <input type="hidden" name="id" value={customer.id} />
      <input type="hidden" name="command" value="profile" />
      <input type="hidden" name="expectedVersion" value={customer.lifecycleVersion} />
      <input type="hidden" name="expectedProfileVersion" value={customer.profileVersion} />
      {state.ok ? (
        <p role="status" className="rounded-md bg-success-bg p-3 text-meta text-brand-900">
          Saved: {state.fields?.join(', ')}.
        </p>
      ) : null}
      <Failure state={state} />
      <ValidationSummary errors={state.errors} scope={formRef} />
      <label className="block text-meta font-semibold text-ink-700">
        Name
        <input
          name="name"
          required
          minLength={2}
          maxLength={160}
          value={values.name}
          onChange={set('name')}
          aria-invalid={Boolean(e.name)}
          className={inputCls}
        />
      </label>
      <label className="block text-meta font-semibold text-ink-700">
        Email (optional)
        <input
          name="email"
          type="email"
          maxLength={254}
          value={values.email}
          onChange={set('email')}
          aria-invalid={Boolean(e.email)}
          className={inputCls}
        />
      </label>
      <label className="block text-meta font-semibold text-ink-700">
        Language
        <select
          name="preferredLocale"
          value={values.preferredLocale}
          onChange={set('preferredLocale')}
          className={inputCls}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="gu">Gujarati</option>
        </select>
      </label>
      <Reason
        id="correction-reason"
        value={values.reason}
        onChange={(reason) => setValues((current) => ({ ...current, reason }))}
        error={e.reason}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-700 px-4 text-meta font-semibold text-white hover:bg-brand-800 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
        Save correction
      </button>
    </form>
  );
}

/** Sign out everywhere without changing the account status. */
export function CustomerSessionRevocation({ customer, openSessions }) {
  const [state, action, pending] = useActionState(customerAccountCommand, {});
  const [reason, setReason] = useState('');
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="id" value={customer.id} />
      <input type="hidden" name="command" value="revoke" />
      <input type="hidden" name="expectedVersion" value={customer.lifecycleVersion} />
      {state.ok ? (
        <p role="status" className="rounded-md bg-success-bg p-3 text-meta text-brand-900">
          {state.revoked
            ? `Signed out of ${state.revoked} session(s).`
            : 'There were no open sessions to end.'}
        </p>
      ) : null}
      <Failure state={state} />
      <Reason id="revoke-reason" value={reason} onChange={setReason} error={state.errors?.reason} />
      <button
        type="submit"
        disabled={pending || openSessions === 0}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-danger px-4 text-meta font-semibold text-danger hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
        Sign out everywhere
      </button>
      {openSessions === 0 ? <p className="text-tiny text-ink-500">No open sessions.</p> : null}
    </form>
  );
}
