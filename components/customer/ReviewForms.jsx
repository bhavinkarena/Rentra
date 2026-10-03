'use client';
import OwnerReviewReply from '@/components/partner/OwnerReviewReply';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { useRouter } from 'next/navigation';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState, useState, useTransition } from 'react';
import { submitCustomerReview, customerReviewReport } from '@/lib/actions/customer';
import { ownerReviewReply, ownerReviewReport } from '@/lib/actions/partner';
import { moderateCustomerReview, resolveReviewReport } from '@/lib/actions/admin';
import { ChevronDown } from 'lucide-react';
const field = `${sharedFieldClass} mt-1 min-h-11`;
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
              {v.slot === 'hourly' ? v.label : `${v.date} · ${v.slot.replaceAll('_', ' ')}`} ·{' '}
              {v.reference}
            </option>
          ))}
        </select>
      </label>
      <Score name="rating" label="Overall rating" required />
      <label className="block">
        Your experience
        <textarea className={field} name="body" required minLength={20} maxLength={3000} />
      </label>
      <details className="group">
        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold">
          Optional ratings
          <ChevronDown
            className="size-4 transition-transform duration-150 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3">
          <Score name="cleanliness" label="Cleanliness" />
          <Score
            name="accuracy"
            label={visits[0]?.slot === 'hourly' ? 'Court condition' : 'Listing accuracy'}
          />
          <Score name="valueForMoney" label="Value for money" />
        </div>
      </details>
      <p className="text-meta">
        Describe your own visit. Do not include phone numbers, access codes or other private
        details. Reviews are checked under the same rules for every score; they are not published
        immediately. You can submit one review per visit.
      </p>
      <button
        disabled={pending}
        className="min-h-11 rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground active:bg-brand-900"
      >
        {pending ? <RentraLoader label="Submitting…" /> : 'Submit review'}
      </button>
      <Result state={state} />
    </form>
  );
}
export function ReviewControl(props) {
  if (props.kind === 'reply')
    return (
      <OwnerReviewReply
        review={{ id: props.id, version: props.version, owner_reply: props.body || null }}
      />
    );
  return <OtherReviewControl {...props} />;
}
function OtherReviewControl({ kind, id, version, body = '' }) {
  const fn = {
    moderate: moderateCustomerReview,
    reply: ownerReviewReply,
    report: customerReviewReport,
    ownerReport: ownerReviewReport,
    resolve: resolveReviewReport,
  }[kind];
  const [state, action, pending] = useActionState(fn, {});
  const report = kind === 'report' || kind === 'ownerReport';
  const [edited, setEdited] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const guarded = ['reply', 'moderate'].includes(kind);
  const preview = edited ? null : state.preview;
  return (
    <form
      className="space-y-3"
      onChange={() => setEdited(true)}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (guarded) {
          data.set('mode', preview ? 'apply' : 'preview');
          if (preview) data.set('previewToken', preview.token);
        }
        setEdited(false);
        startTransition(() => action(data));
      }}
    >
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
      {kind === 'moderate' && (
        <label className="block">
          Policy basis
          <select className={field} name="category">
            <option value="meets_policy">Meets policy, regardless of score</option>
            <option value="private_information">Private information</option>
            <option value="harassment">Harassment</option>
            <option value="spam">Spam</option>
            <option value="unrelated_content">Unrelated content</option>
          </select>
        </label>
      )}
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
          aria-label={
            kind === 'reply'
              ? 'Owner reply'
              : kind === 'resolve'
                ? 'Resolution'
                : report
                  ? 'Report reason'
                  : 'Policy reason (shared with author)'
          }
          name={kind === 'reply' ? 'body' : kind === 'resolve' ? 'resolution' : 'reason'}
          defaultValue={body}
          required
          minLength={10}
          maxLength={kind === 'reply' ? 2000 : 1000}
        />
      </label>
      <button
        disabled={pending}
        className="min-h-11 rounded-full border border-border px-5 font-semibold transition-colors hover:bg-ink-50 disabled:opacity-50"
      >
        {pending ? (
          <RentraLoader label="Saving…" />
        ) : guarded ? (
          preview ? (
            'Confirm publication change'
          ) : (
            'Preview publication change'
          )
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
      {preview && (
        <section
          role="status"
          aria-label="Publication preview"
          className="space-y-3 rounded-lg border border-border p-4"
        >
          <h3 className="font-semibold">Review before confirming</h3>
          <p>{preview.effect}</p>
          <p>Original rating: {preview.rating}/5</p>
          <blockquote className="whitespace-pre-wrap break-words">{preview.body}</blockquote>
          {preview.ownerReply && (
            <p className="whitespace-pre-wrap break-words">
              Public owner reply: {preview.ownerReply}
            </p>
          )}
          {preview.values.reason && <p>Reason shared with the author: {preview.values.reason}</p>}
          <p>Nothing has been saved.</p>
          <button type="button" className="min-h-11 underline" onClick={() => setEdited(true)}>
            Cancel preview
          </button>
        </section>
      )}
      {state.code === 'CHANGED' && (
        <button type="button" className="min-h-11 underline" onClick={() => router.refresh()}>
          Reload review
        </button>
      )}
      <Result state={state} />
    </form>
  );
}
