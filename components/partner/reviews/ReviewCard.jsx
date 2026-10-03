'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown, Flag, MessageSquare, Star } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import OwnerReviewReply from '../OwnerReviewReply';
import { ReviewControl } from '@/components/customer/ReviewForms';
import { formatLocalDate } from '@/lib/domain/booking-dates';

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date not recorded';
const actionClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-meta font-semibold';
export function ReviewStars({ rating }) {
  return (
    <span
      role="img"
      className="inline-flex items-center gap-1"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className="relative inline-block size-4" aria-hidden="true">
          <Star className="size-4 text-ink-300" />
          <span
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${Math.min(1, Math.max(0, Number(rating) - value + 1)) * 100}%` }}
          >
            <Star className="size-4 fill-brand-700 text-brand-700" />
          </span>
        </span>
      ))}
    </span>
  );
}
export default function ReviewCard({ review: r }) {
  const [panel, setPanel] = useState(null),
    [full, setFull] = useState(false);
  const published = r.moderation_state === 'published',
    long = (r.body || '').length > 420;
  const activePanel = panel === 'report' && r.reported_at ? null : panel;
  const guest = r.guest_first_name || 'Guest';
  const state = published ? (r.owner_reply ? 'Replied' : 'Needs reply') : 'Not public';
  const tone = published
    ? r.owner_reply
      ? 'bg-success-bg text-success'
      : 'bg-warning-bg text-warning'
    : 'bg-ink-100 text-ink-600';
  return (
    <article className="min-w-0 px-5 py-6 sm:px-6 sm:py-7" aria-labelledby={`review-title-${r.id}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-100 text-meta font-semibold text-ink-600"
        >
          {guest.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div>
              <h3 id={`review-title-${r.id}`} className="text-meta font-semibold text-ink-900">
                {guest}
              </h3>
              <p className="mt-1 text-tiny text-ink-500">Reviewed {date(r.created_at)}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-tiny font-medium ${tone}`}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {state}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 sm:ml-14">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ReviewStars rating={r.rating} />
          <span className="text-meta font-semibold text-ink-800" aria-hidden="true">
            {r.rating}/5
          </span>
        </div>
        <p className="mt-3 max-w-[72ch] whitespace-pre-wrap break-words text-base leading-7 text-ink-800">
          {long && !full ? `${r.body.slice(0, 420)}…` : r.body || 'No written feedback.'}
        </p>
        {long ? (
          <button
            type="button"
            aria-expanded={full}
            onClick={() => setFull(!full)}
            className="mt-1 inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-800 hover:underline"
          >
            {full ? 'Show less' : 'Read full review'}
            <ChevronDown className={`size-4 ${full ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-tiny text-ink-500">
          <Link
            href={`/partner/listings/${r.rentable_id}/overview`}
            className="inline-flex min-h-11 max-w-full items-center break-words font-medium text-ink-700 hover:underline"
          >
            {r.title || 'Property'}
          </Link>
          <span aria-hidden="true">·</span>
          <span>Visited {formatLocalDate(r.visit_date)}</span>
          <span aria-hidden="true">·</span>
          <span className="break-all">{r.visit_reference}</span>
        </div>
        {r.owner_reply ? (
          <div className="mt-3 border-t border-border pt-4">
            <p className="text-tiny font-semibold text-ink-600">
              {published ? 'Your public reply' : 'Your reply · Not public'}
            </p>
            <p className="mt-2 max-w-[72ch] whitespace-pre-wrap break-words text-meta leading-6 text-ink-600">
              {r.owner_reply}
            </p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {published ? (
              <button
                type="button"
                aria-expanded={panel === 'reply'}
                aria-controls={panel === 'reply' ? `review-panel-${r.id}` : undefined}
                onClick={() => setPanel(panel === 'reply' ? null : 'reply')}
                className={`${actionClass} ${r.owner_reply ? 'border border-border bg-card text-ink-700 hover:bg-ink-50' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
              >
                <MessageSquare className="size-4" aria-hidden="true" />
                {panel === 'reply'
                  ? 'Close editor'
                  : r.owner_reply
                    ? 'Edit reply'
                    : 'Reply to guest'}
              </button>
            ) : null}
            <Link
              href={`/partner/reviews/${r.id}`}
              className={`${actionClass} text-ink-600 hover:bg-ink-50`}
            >
              View details
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {r.reported_at ? (
            <p className="text-tiny text-ink-500">Reported {date(r.reported_at)}</p>
          ) : (
            <button
              type="button"
              aria-expanded={panel === 'report'}
              aria-controls={panel === 'report' ? `review-panel-${r.id}` : undefined}
              onClick={() => setPanel(panel === 'report' ? null : 'report')}
              className="inline-flex min-h-11 items-center gap-2 px-2 text-tiny text-ink-500 hover:text-ink-800"
            >
              <Flag className="size-3.5" aria-hidden="true" />
              {panel === 'report' ? 'Close report' : 'Report'}
            </button>
          )}
        </div>
        {activePanel ? (
          <div id={`review-panel-${r.id}`} className="mt-5 border-t border-border pt-5">
            {activePanel === 'reply' ? (
              <OwnerReviewReply key={r.version} review={r} autoFocus />
            ) : (
              <>
                <h4 className="text-meta font-semibold text-ink-800">Report a policy violation</h4>
                <p className="mt-2 mb-4 max-w-[65ch] text-meta leading-6 text-ink-600">
                  Reporting does not remove a review or change its rating. Explain the policy
                  violation without sharing guest contact details.
                </p>
                <ReviewControl kind="ownerReport" id={r.id} />
              </>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
