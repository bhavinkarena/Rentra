'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState } from 'react';
import { submitCustomerReview, customerReviewReport } from '@/lib/actions/customer';
import { ownerReviewReply, ownerReviewReport } from '@/lib/actions/partner';
import { moderateCustomerReview, resolveReviewReport } from '@/lib/actions/admin';
const field = 'mt-1 block min-h-11 w-full rounded border border-border p-2';
function Result({ state }) {
  return (
    <>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.message ? <p role="status">{state.message}</p> : null}
    </>
  );
}
function Score({ name, label, required = false }) {
  return (
    <label className="block">
      {label}
      <select className={field} name={name} required={required} defaultValue="">
        <option value="">{required ? 'Choose a rating' : 'Not rated'}</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n} out of 5
          </option>
        ))}
      </select>
    </label>
  );
}
export function CustomerReviewForm({ visits }) {
  const [state, action, pending] = useActionState(submitCustomerReview, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        Completed visit
        <select name="visitId" required className={field}>
          {visits.map((v) => (
            <option value={v.id} key={v.id}>
              {v.date} · {v.slot.replaceAll('_', ' ')} · {v.reference}
            </option>
          ))}
        </select>
      </label>
      <Score name="rating" label="Overall rating" required />
      <label className="block">
        Your experience
        <textarea className={field} name="body" required minLength={20} maxLength={3000} />
      </label>
      <details>
        <summary className="min-h-11 cursor-pointer">Optional ratings</summary>
        <div className="space-y-3">
          <Score name="cleanliness" label="Cleanliness" />
          <Score name="accuracy" label="Listing accuracy" />
          <Score name="valueForMoney" label="Value for money" />
        </div>
      </details>
      <p className="text-meta">
        Describe your own visit. Do not include phone numbers, access codes or other private
        details. Reviews are checked under the same rules for every score; they are not published
        immediately. You can submit one review per visit.
      </p>
      <button disabled={pending} className="min-h-11 rounded bg-brand-700 px-4 text-white">
        {pending ? <RentraLoader label="Submitting…" /> : 'Submit review'}
      </button>
      <Result state={state} />
    </form>
  );
}
export function ReviewControl({ kind, id, version, body = '' }) {
  const fn = {
    moderate: moderateCustomerReview,
    reply: ownerReviewReply,
    report: customerReviewReport,
    ownerReport: ownerReviewReport,
    resolve: resolveReviewReport,
  }[kind];
  const [state, action, pending] = useActionState(fn, {});
  const report = kind === 'report' || kind === 'ownerReport';
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version ?? 0} />
      {kind === 'moderate' ? (
        <label className="block">
          Publication decision
          <select className={field} name="state" defaultValue="published">
            <option value="published">Publish</option>
            <option value="rejected">Reject for policy violation</option>
            <option value="hidden">Hide from public view</option>
          </select>
        </label>
      ) : null}
      <label className="block">
        {kind === 'reply'
          ? 'Owner reply'
          : kind === 'resolve'
            ? 'Resolution'
            : report
              ? 'Report reason'
              : 'Policy reason (shared with author)'}
        <textarea
          className={field}
          name={kind === 'reply' ? 'body' : kind === 'resolve' ? 'resolution' : 'reason'}
          defaultValue={body}
          required
          minLength={10}
          maxLength={kind === 'reply' ? 2000 : 1000}
        />
      </label>
      <button disabled={pending} className="min-h-11 rounded border border-border px-4">
        {pending ? (
          <RentraLoader label="Saving…" />
        ) : kind === 'reply' ? (
          'Save owner reply'
        ) : kind === 'resolve' ? (
          'Close report'
        ) : report ? (
          'Submit report'
        ) : (
          'Save moderation decision'
        )}
      </button>
      <Result state={state} />
    </form>
  );
}
