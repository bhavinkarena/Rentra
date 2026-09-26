'use client';

import { useActionState, useRef, useState } from 'react';
import LoaderCircle from '@/components/ui/rentra-loader';
import RetryButton from '@/components/portal/RetryButton';
import ValidationSummary from '@/components/portal/ValidationSummary';

const STATUS = {
  active: 'Active',
  pending_application: 'Onboarding',
  suspended: 'Suspended',
  blocked: 'Blocked',
};
const VERBS = { suspend: 'Suspend account', reinstate: 'Reinstate account' };

/**
 * Suspend / reinstate with the impact the admin actually reviewed.
 *
 * `expectedVersion` travels with the command; if another admin changed the
 * account first the API answers 409 and nothing is applied. The reason is
 * controlled state so a failed submit never clears what was typed.
 */
/**
 * `command` is the server action; `verbs` names the two actions for this
 * kind of account (a customer is "restricted", a client "suspended").
 */
export default function AccountLifecyclePanel({
  subjectId,
  preview,
  command,
  verbs = VERBS,
  statuses = STATUS,
}) {
  const [state, action, pending] = useActionState(command, {});
  const [reason, setReason] = useState('');
  const formRef = useRef(null);
  const suspend = preview.action === 'suspend';
  const stale = ['LIFECYCLE_CONFLICT', 'ACCOUNT_CONFLICT', 'LIFECYCLE_NOT_ALLOWED'].includes(
    state.code,
  );

  return (
    <section
      id="lifecycle"
      aria-labelledby="lifecycle-title"
      className="scroll-mt-24 rounded-lg border border-border bg-card p-5"
    >
      <h2 id="lifecycle-title" className="text-h4 font-bold text-ink-900">
        Account status
      </h2>
      <p className="mt-1 text-tiny text-ink-500">
        Current: <strong className="text-ink-800">{statuses[preview.fromStatus]}</strong> · version{' '}
        {preview.expectedVersion}
      </p>

      {state.ok ? (
        <p role="status" className="mt-3 rounded-md bg-success-bg p-3 text-meta text-brand-900">
          Saved. The account is now <strong>{statuses[state.accountStatus]}</strong>.
        </p>
      ) : null}

      {!preview.allowed ? (
        <p className="mt-3 rounded-md border-l-4 border-border bg-ink-25 p-3 text-meta text-ink-700">
          {preview.blockedReason}
        </p>
      ) : (
        <form ref={formRef} action={action} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={subjectId} />
          <input type="hidden" name="action" value={preview.action} />
          <input type="hidden" name="expectedVersion" value={preview.expectedVersion} />

          <div className="rounded-md border border-warning/30 bg-warning-bg p-3 text-meta text-amber-900">
            <p className="font-semibold">
              {verbs[preview.action]}: {statuses[preview.fromStatus]} → {statuses[preview.toStatus]}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {preview.consequences.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {suspend && preview.upcomingVisits?.length ? (
              <p className="mt-2">
                Next visit: {preview.upcomingVisits[0].reference} ·{' '}
                {preview.upcomingVisits[0].listingTitle} · {preview.upcomingVisits[0].day}. See
                Upcoming visits below for the fulfillment list.
              </p>
            ) : null}
          </div>

          {state.error && !state.errors ? (
            <div
              role="alert"
              className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger"
            >
              <p>{state.error}</p>
              {stale ? (
                <div className="mt-3">
                  <RetryButton label="Reload current status" />
                </div>
              ) : null}
            </div>
          ) : null}
          <ValidationSummary errors={state.errors} scope={formRef} />

          <label className="block text-meta font-semibold text-ink-700" htmlFor="lifecycle-reason">
            Reason (kept in the audit history)
          </label>
          <textarea
            id="lifecycle-reason"
            name="reason"
            required
            minLength={4}
            maxLength={1000}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={Boolean(state.errors?.reason)}
            aria-describedby={state.errors?.reason ? 'lifecycle-reason-error' : undefined}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-meta"
          />
          {state.errors?.reason ? (
            <p id="lifecycle-reason-error" className="text-tiny font-medium text-danger">
              {state.errors.reason}
            </p>
          ) : null}

          <label className="flex items-start gap-2 text-meta text-ink-700">
            <input type="checkbox" name="reviewed" required className="mt-1 size-4" />
            <span>I have reviewed the impact above.</span>
          </label>

          <button
            type="submit"
            disabled={pending}
            className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-meta font-semibold text-white disabled:cursor-wait disabled:opacity-70 ${
              suspend ? 'bg-danger hover:bg-danger/90' : 'bg-brand-700 hover:bg-brand-800'
            }`}
          >
            {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
            {verbs[preview.action]}
          </button>
        </form>
      )}
    </section>
  );
}
