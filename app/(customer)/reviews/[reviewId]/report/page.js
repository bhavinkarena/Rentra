import { notFound } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { ReviewControl } from '@/components/customer/ReviewForms';
import { REPORT_OUTCOME_LABELS } from '@/lib/domain/status';
export const metadata = { title: 'Report review', robots: { index: false, follow: false } };
export default async function Report({ params }) {
  const id = (await params).reviewId;
  let review;
  /* The API validates the id shape and scopes the read to what a customer may
    see, so a malformed or hidden review is the same 404 either way. */
  try {
    review = await customerApi.review(id);
  } catch (e) {
    if (e instanceof ApiError && [400, 403, 404, 422].includes(e.status)) notFound();
    throw e;
  }
  return (
    <section className="mx-auto max-w-2xl space-y-5 p-4">
      <h1 className="text-h1">Report review or reply</h1>
      {review.body ? (
        <p className="break-words">{review.body}</p>
      ) : (
        <p>This review is no longer public.</p>
      )}
      {review.ownerReply ? <p>Owner reply: {review.ownerReply}</p> : null}
      <p>
        Tell us which content violates the review rules and why. A report is saved for staff review;
        it does not automatically remove content.
      </p>
      {review.myReport ? (
        <section className="space-y-2 rounded-md border border-border p-4" aria-label="Your report">
          <h2 className="text-h3">Your report</h2>
          <p className="whitespace-pre-wrap break-words">{review.myReport.reason}</p>
          {review.myReport.attachments?.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {review.myReport.attachments.map((a, i) => (
                <li key={a.id}>
                  <a
                    className="inline-flex min-h-11 items-center underline"
                    href={`/reviews/reports/${review.myReport.id}/attachments/${a.id}?download=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Evidence photo {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {review.myReport.outcome ? (
            <p>
              <strong>{REPORT_OUTCOME_LABELS[review.myReport.outcome]}</strong> ·{' '}
              {review.myReport.resolution}
            </p>
          ) : (
            <p>Open — staff will record an outcome here.</p>
          )}
        </section>
      ) : (
        <ReviewControl kind="report" id={id} />
      )}
    </section>
  );
}
