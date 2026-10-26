'use client';

import { CommandForm, FieldError, control } from '@/components/admin/PropertyCommandForm';
import { adminDateTime } from '@/lib/domain/admin-display';

const STATE = {
  requested: 'Requested — waiting for the owner',
  uploaded: 'Uploaded by the owner, not sent yet',
  submitted: 'Sent by the owner — not a review outcome',
};
const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Story 1.3: ask the owner for a property video and inspect what they sent.
 * A video is supporting evidence only; it is never a physical inspection and
 * requesting or watching one changes no review, publication or booking state.
 */
export default function VideoEvidencePanel({ id, submissionId, requests, writable }) {
  return (
    <div className="space-y-4">
      {requests.length ? (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id} className="text-meta">
              <strong>
                Pass {r.passNumber} · {STATE[r.state]}
              </strong>
              <p className="mt-1 text-ink-600">
                Requested {adminDateTime(r.requestedAt)}
                {r.requestedBy ? ` by ${r.requestedBy}` : ''}
                {r.submittedAt ? ` · sent ${adminDateTime(r.submittedAt)}` : ''}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{r.reason}</p>
              {r.state === 'submitted' ? (
                <>
                  <video
                    controls
                    preload="none"
                    className="mt-2 w-full max-w-xl rounded-md bg-ink-900"
                    src={`/admin/evidence-videos/${id}/${r.id}`}
                    aria-label={`Property video for pass ${r.passNumber}`}
                  />
                  <p className="mt-1 text-ink-600">
                    {r.video.format.toUpperCase()} · {megabytes(r.video.bytes)}. Video evidence is
                    not a physical inspection.
                  </p>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-meta text-ink-600">No property video has been requested.</p>
      )}
      {writable && submissionId ? (
        <CommandForm
          id={id}
          command="evidence"
          hidden={{ submissionId }}
          submitLabel="Request property video"
        >
          {(errors) => (
            <>
              <label className="block text-meta font-semibold text-ink-700">
                What the video must show
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  className={control}
                />
              </label>
              <FieldError message={errors.reason} />
              <label className="flex min-h-10 items-center gap-2 text-meta">
                <input type="checkbox" required className="size-4 accent-brand-700" />
                Send this request to the owner. It does not approve, reject or publish the property.
              </label>
            </>
          )}
        </CommandForm>
      ) : null}
    </div>
  );
}
