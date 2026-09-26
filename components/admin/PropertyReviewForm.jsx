'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { propertyReviewCommand } from '@/lib/actions/admin';
import ValidationSummary from '@/components/portal/ValidationSummary';

const sections = [
  'basics',
  'location',
  'capacity',
  'amenities',
  'rules',
  'pricing',
  'terms',
  'photos',
  'ownership',
];
const control = 'mt-1 w-full rounded-md border border-border bg-card p-3 text-meta';

export default function PropertyReviewForm({
  id,
  submissionId,
  assignedTo,
  adminId,
  canDecide,
  writable,
}) {
  const [state, action, pending] = useActionState(propertyReviewCommand, {});
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState('changes_requested');
  const [flagged, setFlagged] = useState([]);
  const form = useRef(null);
  const router = useRouter();
  if (!writable)
    return <p className="mt-4 text-meta">You have read-only access to property reviews.</p>;
  return (
    <form ref={form} action={action} className="mt-5 space-y-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="submissionId" value={submissionId} />
      <ValidationSummary errors={state.errors} scope={form} />
      {state.error ? (
        <div role="alert" className="rounded-md border border-danger p-3 text-meta text-danger">
          <p>{state.error}</p>
          <button type="button" onClick={() => router.refresh()} className="mt-2 underline">
            Reload current review
          </button>
        </div>
      ) : null}
      {state.ok ? (
        <p role="status" className="rounded-md bg-brand-50 p-3 text-meta text-brand-800">
          Saved. The current review status has been updated.
        </p>
      ) : null}
      <fieldset disabled={pending} className="space-y-4">
        <legend className="text-meta font-semibold">Reviewer assignment</legend>
        <input
          type="hidden"
          name="action"
          value={assignedTo === adminId ? 'release' : assignedTo ? 'takeover' : 'claim'}
        />
        <button
          className="min-h-11 rounded-md border border-border px-4 text-meta font-semibold"
          type="submit"
          name="command"
          value="assign"
          formNoValidate
        >
          {assignedTo === adminId
            ? 'Release assignment'
            : assignedTo
              ? 'Take over review'
              : 'Assign to me'}
        </button>
      </fieldset>
      <fieldset
        disabled={pending || !canDecide || Boolean(assignedTo && assignedTo !== adminId)}
        className="space-y-4 disabled:opacity-60"
      >
        <legend className="text-h4 font-semibold">Decision on this submitted revision</legend>
        <p className="text-meta text-ink-600">
          Approval moves this property to verification. It does not publish it or make it bookable.
        </p>
        <label className="block text-meta font-semibold">
          Outcome
          <select
            name="outcome"
            className={control}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
          >
            <option value="changes_requested">Request changes</option>
            <option value="rejected">Reject submission</option>
            <option value="approved_for_visit">Approve for verification</option>
          </select>
        </label>
        <label className="block text-meta font-semibold">
          Reason shown to the client
          <textarea
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={4}
            maxLength={2000}
            rows={4}
            className={control}
          />
        </label>
        <fieldset>
          <legend className="text-meta font-semibold">
            Sections to correct (required when requesting changes)
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sections.map((section) => (
              <label
                key={section}
                className="flex min-h-11 items-center gap-2 text-meta capitalize"
              >
                <input
                  type="checkbox"
                  name="flagged"
                  value={section}
                  checked={flagged.includes(section)}
                  onChange={(event) =>
                    setFlagged(
                      event.target.checked
                        ? [...flagged, section]
                        : flagged.filter((value) => value !== section),
                    )
                  }
                  className="size-4 accent-brand-700"
                />
                {section}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          name="command"
          value="decide"
          className="min-h-11 rounded-md bg-brand-700 px-5 text-meta font-semibold text-white"
        >
          {pending ? 'Saving…' : 'Record decision'}
        </button>
      </fieldset>
    </form>
  );
}
