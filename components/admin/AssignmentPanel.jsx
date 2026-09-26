'use client';

import { useActionState } from 'react';
import LoaderCircle from '@/components/ui/rentra-loader';
import RetryButton from '@/components/portal/RetryButton';
import { assignApplication } from '@/lib/actions/admin';

/** Claim, release or take over; the reviewer on record is who decides. */
export default function AssignmentPanel({ applicationId, review }) {
  const [state, action, pending] = useActionState(assignApplication, {});
  const mine = review.assignedToMe;
  const other = review.assignee && !mine;
  const command = mine ? 'release' : other ? 'takeover' : 'claim';
  const label = { claim: 'Assign to me', release: 'Release', takeover: 'Take over' }[command];
  return (
    <section
      aria-labelledby="assignment-title"
      className="overflow-hidden rounded-lg border border-border bg-card shadow-xs"
    >
      <h2
        id="assignment-title"
        className="border-b border-border px-5 py-4 text-h4 font-bold text-ink-900"
      >
        Reviewer
      </h2>
      <div className="p-5">
        <p className="text-meta text-ink-800">
          {mine ? 'Assigned to you' : other ? `Assigned to ${review.assignee.email}` : 'Unassigned'}
        </p>
        {other ? (
          <p className="mt-1 text-tiny text-ink-500">
            Take over only after agreeing it with them; the change is recorded.
          </p>
        ) : null}
        {state.error ? (
          <div role="alert" className="mt-2 rounded-md bg-danger-bg p-2 text-tiny text-danger">
            <p>{state.error}</p>
            <div className="mt-2">
              <RetryButton label="Reload" />
            </div>
          </div>
        ) : null}
        <form action={action} className="mt-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="action" value={command} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50 disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
            {label}
          </button>
        </form>
      </div>
    </section>
  );
}
