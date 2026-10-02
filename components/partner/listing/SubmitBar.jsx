'use client';
import Loader2 from '@/components/ui/rentra-loader';
import { useActionState } from 'react';
import { Check, AlertTriangle, Pause, Play } from 'lucide-react';
import { toggleListingPause } from '@/lib/actions/partner';
import { Button } from '@/components/ui/button';
import { sectionAnchorId } from '@/lib/domain/listing-steps';
function PauseControl({ listing }) {
  const [state, action, pending] = useActionState(toggleListingPause, {});
  const paused = listing.status === 'paused';

  return (
    <form action={action} className="mt-3 border-t border-brand-200 pt-3">
      <input type="hidden" name="id" value={listing.id} />
      {state.errors?._ ? (
        <p className="mb-2 text-tiny font-medium text-danger">{state.errors._}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-meta font-semibold text-ink-700 underline underline-offset-4 hover:text-ink-900 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-4 " aria-hidden="true" />
        ) : paused ? (
          <Play className="size-4" aria-hidden="true" />
        ) : (
          <Pause className="size-4" aria-hidden="true" />
        )}
        {paused ? 'Take bookings again' : 'Pause new bookings'}
      </button>
      <p className="mt-1.5 text-tiny text-ink-600">
        {paused
          ? 'Guests cannot find or book this property right now. Your calendar and confirmed bookings are untouched.'
          : 'Takes it out of search without deleting anything. Bookings already confirmed still stand.'}
      </p>
    </form>
  );
}

export function SubmitBar({ listing, completion, submitAction, ownerApproved = true }) {
  const [state, action, pending] = useActionState(submitAction, {});

  if (completion.isLive) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <p className="text-h4 font-bold text-brand-900">This property is live</p>
        <p className="mt-1 text-meta text-brand-800">
          Price and calendar changes apply immediately. Changing photos, the address, capacity or
          amenities sends it back for a quick re-check.
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
        <PauseControl listing={listing} />
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
          whenever you are ready. Changing photos, the address, capacity or amenities sends it back
          for review first.
        </p>
        <PauseControl listing={listing} />
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
          confirmed still stand. You can keep editing; changes to photos, the address, capacity or
          amenities will need review after it is restored. Contact Rentra support to resolve it.
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
      {state.errors?._ ? (
        <p className="mb-3 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          {state.errors._}
        </p>
      ) : null}

      {listing.rejectionReason ? (
        <p className="mb-3 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          <strong>Sent back:</strong> {listing.rejectionReason}
        </p>
      ) : null}

      {listing.reviewFlaggedFields?.length ? (
        <p className="mb-3 text-meta text-warning">
          Sections to correct:{' '}
          {listing.reviewFlaggedFields.map((section, index) => (
            <span key={section}>
              {index ? ', ' : ''}
              <a className="underline" href={`#${sectionAnchorId(section)}`}>
                {section}
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
        <form action={action}>
          <input type="hidden" name="id" value={listing.id} />
          <Button type="submit" size="lg" className="w-full" disabled={pending || !ownerApproved}>
            {pending ? <Loader2 className="size-4 " /> : null}
            Submit for review
          </Button>
          <p className="mt-2 text-center text-tiny text-ink-500">
            {ownerApproved
              ? 'Every property is checked before it goes live. 2 working days.'
              : 'You can submit once your account is approved.'}
          </p>
        </form>
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
