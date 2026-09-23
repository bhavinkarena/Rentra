import { notFound } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { ReviewControl } from '@/components/customer/ReviewForms';
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
      <p className="break-words">{review.body}</p>
      {review.ownerReply ? <p>Owner reply: {review.ownerReply}</p> : null}
      <p>
        Tell us which content violates the review rules and why. A report is saved for staff review;
        it does not automatically remove content.
      </p>
      <ReviewControl kind="report" id={id} />
    </section>
  );
}
