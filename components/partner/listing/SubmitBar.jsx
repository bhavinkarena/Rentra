'use client';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { stepHref } from '@/lib/domain/listing-steps';
import { trustFieldSentence } from '@/lib/domain/listing-trust';
import PauseButton from '@/components/partner/property/PauseButton';
import SubmitForReview from '@/components/partner/property/SubmitForReview';
export function SubmitBar({ listing, completion, ownerApproved = true }) {
  const review = trustFieldSentence(listing.trustFields);

  if (completion.isLive) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <p className="text-h4 font-bold text-brand-900">This property is live</p>
        <p className="mt-1 text-meta text-brand-800">
          Prices, the calendar, the description and photo order change immediately. Changing{' '}
          {review} sends it back for a quick Rentra review first.
        </p>
        {listing.adminCorrection ? (
          <p className="mt-2 rounded-md bg-card p-3 text-meta text-ink-800">
            <strong>Rentra corrected</strong> {listing.adminCorrection.fields.join(', ')} on{' '}
            {new Date(listing.adminCorrection.at).toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
            })}
            : {listing.adminCorrection.reason}
          </p>
        ) : null}
        {listing.bookingConfig?.inventoryReady !== true ? (
          <p className="mt-2 text-meta font-semibold text-warning">
            Guests can see it but cannot book yet: confirm your booking hours and open dates on the
            calendar.
          </p>
        ) : null}
        <div className="mt-3 border-t border-brand-200 pt-3">
          <PauseButton listing={listing} />
        </div>
      </div>
    );
  }

  /**
   * Paused is complete, not live, and not in review — which used to fall
   * through to the "sections left" branch below and render "0 sections left —
   * ." to an owner whose listing was perfectly finished.
   */
  if (listing.status === 'paused') {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-h4 font-bold text-ink-900">Paused by you</p>
        <p className="mt-1 text-meta text-ink-600">
          This property is not in search and cannot be booked. Everything about it is saved — resume
          whenever you are ready. Changing {review} sends it back for review first.
        </p>
        <div className="mt-3">
          <PauseButton listing={listing} />
        </div>
      </div>
    );
  }

  /** Hidden by Rentra is not the owner's to undo, so no control is offered. */
  if (listing.status === 'hidden') {
    const reason = listing.restriction?.reason ?? listing.restrictionReason;
    return (
      <div className="rounded-lg border border-warning/30 bg-warning-bg p-4">
        <p className="text-h4 font-bold text-warning">Hidden by Rentra</p>
        {reason ? (
          <p className="mt-1 text-meta font-semibold text-ink-800">Reason: {reason}</p>
        ) : null}
        <p className="mt-1 text-meta text-ink-700">
          Guests cannot find or book this property, and only Rentra can restore it. Bookings already
          confirmed still stand. You can keep editing; changes to {review} will need review after it
          is restored. Contact Rentra support to resolve it.
        </p>
      </div>
    );
  }

  if (completion.inReview && !listing.reviewNeedsResubmission) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning-bg p-4">
        <p className="text-h4 font-bold text-warning">
          {listing.status === 'pending_verification'
            ? 'Verification visit next'
            : 'With us for review'}
        </p>
        <p className="mt-1 text-meta text-ink-700">
          {listing.status === 'pending_verification'
            ? 'Your submitted revision is approved for verification. It is not published yet.'
            : 'Your submitted revision is waiting for review. If you edit it, resubmit the updated version. Check this workspace for the decision.'}
        </p>
        {listing.status === 'pending_verification' ? (
          <p className="mt-2 text-meta font-semibold text-ink-800">
            {listing.reviewVerification
              ? `${listing.reviewVerification.mode === 'physical' ? 'Site visit' : 'Video call'} scheduled for ${new Date(
                  listing.reviewVerification.scheduledAt,
                ).toLocaleString('en-IN', {
                  timeZone: listing.reviewVerification.timeZone,
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })} (${listing.reviewVerification.timeZone}).`
              : 'Rentra will schedule a video call or site visit with you. Editing the property now sends it back for review.'}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {listing.rejectionReason ? (
        <p className="mb-3 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          <strong>Sent back:</strong> {listing.rejectionReason}
        </p>
      ) : null}

      {listing.reviewFlags?.length ? (
        <p className="mb-3 text-meta text-warning">
          Sections to correct:{' '}
          {listing.reviewFlags.map((flag, index) => (
            <span key={flag.section}>
              {index ? ', ' : ''}
              <a className="underline" href={stepHref(listing.id, flag.step)}>
                {flag.step}
              </a>
            </span>
          ))}
          . Update these sections, then resubmit for review.
        </p>
      ) : null}
      {listing.reviewNeedsResubmission ? (
        <p className="mb-3 text-meta text-warning">
          This property has changes that have not been submitted. Resubmit so Rentra can review the
          current version.
        </p>
      ) : null}

      {completion.canSubmit ? (
        <div className="[&_button]:w-full">
          <SubmitForReview listing={listing} ownerApproved={ownerApproved} />
          {ownerApproved ? (
            <p className="mt-2 text-center text-tiny text-ink-500">
              Every property is checked before it goes live. 2 working days.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden="true" />
          <p className="text-meta text-ink-600">
            <strong className="text-ink-900">
              {completion.remaining.length} section
              {completion.remaining.length === 1 ? '' : 's'} left
            </strong>
            {' — '}
            {completion.remaining.map((s) => s.label.toLowerCase()).join(', ')}.
            {completion.minutesLeft ? ` About ${completion.minutesLeft} minutes.` : ''}
          </p>
        </div>
      )}
      {!ownerApproved && !completion.canSubmit ? (
        <div className="mt-4">
          <Button type="button" size="lg" className="w-full" disabled>
            Submit for review
          </Button>
          <p className="mt-2 text-center text-tiny text-ink-500">
            You can submit once your account is approved.
          </p>
        </div>
      ) : null}
    </div>
  );
}
