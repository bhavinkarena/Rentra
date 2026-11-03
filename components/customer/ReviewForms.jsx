'use client';
import OwnerReviewReply from '@/components/partner/OwnerReviewReply';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { submitCustomerReview, customerReviewReport } from '@/lib/actions/customer';
import { ownerReviewReply, ownerReviewReport } from '@/lib/actions/partner';
import { moderateCustomerReview, resolveReviewReport } from '@/lib/actions/admin';
import { ChevronDown } from 'lucide-react';
import {
  EXPERIENCE_SCOPE_LABELS,
  REVIEW_REASON_LABELS,
  REPORT_OUTCOME_LABELS,
} from '@/lib/domain/status';
const field = `${sharedFieldClass} mt-1 min-h-11`;
function Result({ state }) {
  return (
    <>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.message ? <p role="status">{state.message}</p> : null}
    </>
  );
}
function Score({ name, label, required = false, values }) {
  return (
    <label className="block">
      {label}
      <select
        className={field}
        name={name}
        required={required}
        defaultValue={values?.[name] ? String(values[name]) : ''}
      >
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
async function submitWithAttempt(previous, form) {
  // Each attempt gets a new number so the form remounts with the returned values, even after an identical failure.
  return { ...(await submitCustomerReview(previous, form)), attempt: (previous.attempt ?? 0) + 1 };
}
/** `scope` (Story 5.2): an approved arrival exception — overall stars and text only. */
export function CustomerReviewForm({ visits, listingHref, scope = null }) {
  const [state, action, pending] = useActionState(submitWithAttempt, {});
  const router = useRouter();
  const saved = Boolean(state.state && !state.error);
  useEffect(() => {
    if (saved) router.refresh();
  }, [saved, state.attempt, router]);
  // A failed submit returns the entered values; a success starts a fresh form for any remaining visit.
  const values = saved ? undefined : state.values;
  return (
    <>
      {saved ? (
        <div role="status" className="mb-4 space-y-1 rounded-lg border border-border p-3">
          <p className="font-semibold">{state.message}</p>
          {state.state === 'published' && listingHref ? (
            <Link className="inline-flex min-h-11 items-center underline" href={listingHref}>
              See it on the listing
            </Link>
          ) : null}
        </div>
      ) : null}
      <form action={action} className="space-y-4" key={state.attempt ?? 0}>
        {scope ? (
          <p className="rounded-md bg-ink-25 p-3 text-meta">
            {EXPERIENCE_SCOPE_LABELS[scope]}. Rate only what you experienced on arrival; this review
            shows that label and has no stay sub-scores.
          </p>
        ) : null}
        <label className="block">
          {scope ? 'Visit' : 'Completed visit'}
          <select name="visitId" required className={field} defaultValue={values?.visitId}>
            {visits.map((v) => (
              <option value={v.id} key={v.id}>
                {v.slot === 'hourly' ? v.label : `${v.date} · ${v.slot.replaceAll('_', ' ')}`} ·{' '}
                {v.reference}
              </option>
            ))}
          </select>
        </label>
        <Score values={values} name="rating" label="Overall rating" required />
        <label className="block">
          Your experience
          <textarea
            className={field}
            name="body"
            required
            minLength={20}
            maxLength={3000}
            defaultValue={values?.body ?? ''}
          />
        </label>
        {scope ? null : (
          <details className="group">
            <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold">
              {visits[0]?.slot === 'stay' ? 'Rate your stay (optional)' : 'Optional ratings'}
              <ChevronDown
                className="size-4 transition-transform duration-150 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            {visits[0]?.slot === 'stay' ? (
              /* Hotel stays (hotel plan, Phase 8): six sub-scores and who travelled. */
              <div className="grid gap-3 sm:grid-cols-2">
                <Score values={values} name="cleanliness" label="Cleanliness" />
                <Score values={values} name="staff" label="Staff and service" />
                <Score values={values} name="location" label="Location" />
                <Score values={values} name="comfort" label="Room comfort" />
                <Score values={values} name="valueForMoney" label="Value for money" />
                <Score values={values} name="facilities" label="Facilities" />
                <label className="block sm:col-span-2">
                  Who travelled
                  <select
                    className={field}
                    name="travellerType"
                    defaultValue={values?.travellerType ?? ''}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="business">Business</option>
                    <option value="couple">Couple</option>
                    <option value="family">Family</option>
                    <option value="friends">Friends</option>
                    <option value="solo">Solo</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <Score values={values} name="cleanliness" label="Cleanliness" />
                <Score
                  values={values}
                  name="accuracy"
                  label={visits[0]?.slot === 'hourly' ? 'Court condition' : 'Listing accuracy'}
                />
                <Score values={values} name="valueForMoney" label="Value for money" />
              </div>
            )}
          </details>
        )}
        <p className="text-meta">
          Describe your own visit. Do not include phone numbers, links, access codes or other
          private details. Every score is checked under the same rules, and most reviews go live
          straight away. You can submit one review per visit.
        </p>
        <button
          disabled={pending}
          className="min-h-11 rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground active:bg-brand-900"
        >
          {pending ? <RentraLoader label="Submitting…" /> : 'Submit review'}
        </button>
        {saved ? null : <Result state={state} />}
      </form>
    </>
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
function OtherReviewControl({ kind, id, version, body = '', removed = false }) {
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
  const [outcome, setOutcome] = useState('not_violation');
  const [photoError, setPhotoError] = useState(null);
  // Already hidden/rejected under a policy reason: upholding records that decision, no new step.
  const upheld = kind === 'resolve' && outcome === 'upheld' && !removed;
  // Upholding a report hides or rejects the review, so it shares the moderation preview step.
  const guarded = ['reply', 'moderate'].includes(kind) || upheld;
  const decides = kind === 'moderate' || upheld;
  const preview = edited ? null : state.preview;
  return (
    <form
      className="space-y-3"
      onChange={() => setEdited(true)}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (report) {
          const photos = data.getAll('photos').filter((f) => f.size > 0);
          const problem =
            photos.length > 3
              ? 'Attach up to 3 photos.'
              : photos.some((f) => f.size > 2 * 1024 * 1024)
                ? 'Keep each photo under 2 MB.'
                : null;
          setPhotoError(problem);
          if (problem) return;
        }
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
      {kind === 'resolve' && (
        <fieldset className="space-y-1">
          <legend className="font-semibold">Outcome</legend>
          <div className="flex flex-wrap gap-x-5">
            {Object.entries(REPORT_OUTCOME_LABELS).map(([value, label]) => (
              <label key={value} className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="outcome"
                  value={value}
                  checked={outcome === value}
                  onChange={() => setOutcome(value)}
                  className="size-5"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {decides ? (
        <label className="block">
          Publication decision
          <select className={field} name="state" defaultValue={upheld ? 'hidden' : 'published'}>
            {upheld ? null : <option value="published">Publish</option>}
            <option value="rejected">Reject for policy violation</option>
            <option value="hidden">Hide from public view</option>
          </select>
        </label>
      ) : null}
      {decides && (
        <label className="block">
          Policy basis
          <select className={field} name="category">
            {Object.entries(REVIEW_REASON_LABELS)
              .filter(([value]) => !upheld || value !== 'meets_policy')
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      )}
      <label className="block">
        {kind === 'reply'
          ? 'Owner reply'
          : kind === 'resolve'
            ? 'Outcome note (shared with the reporter)'
            : report
              ? 'Report reason'
              : 'Policy reason (shared with author)'}
        <textarea
          className={field}
          aria-label={
            kind === 'reply'
              ? 'Owner reply'
              : kind === 'resolve'
                ? 'Outcome note (shared with the reporter)'
                : report
                  ? 'Report reason'
                  : 'Policy reason (shared with author)'
          }
          name={kind === 'reply' ? 'body' : kind === 'resolve' ? 'note' : 'reason'}
          defaultValue={state.values?.reason ?? body}
          required
          minLength={10}
          maxLength={kind === 'reply' ? 2000 : 1000}
        />
      </label>
      {report && (
        <label className="block">
          Evidence photos or screenshots (optional, up to 3)
          <input
            className={`${field} py-2`}
            type="file"
            name="photos"
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-invalid={photoError ? true : undefined}
            aria-describedby={photoError ? `photos-error-${id}` : undefined}
          />
          {photoError && (
            <span id={`photos-error-${id}`} role="alert" className="block text-meta text-danger">
              {photoError}
            </span>
          )}
          <span className="text-meta">
            JPG, PNG or WebP, 2 MB each. Only Rentra staff see them.
          </span>
        </label>
      )}
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
          {preview.values.category && (
            <p>Policy basis: {REVIEW_REASON_LABELS[preview.values.category]}</p>
          )}
          {preview.values.reason && <p>Reason shared with the author: {preview.values.reason}</p>}
          {upheld && <p>Confirming also closes the report as Upheld.</p>}
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
