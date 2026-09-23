import Link from 'next/link';
import { ReviewControl } from './ReviewForms';
export default function ReviewQueue({ data, admin = false }) {
  return (
    <section className="mx-auto max-w-4xl space-y-5 p-4">
      <h1 className="text-h1">{admin ? 'Customer review moderation' : 'Property reviews'}</h1>
      <p>
        {admin
          ? 'Apply the same rules to every score. Negative experiences and low ratings are not grounds for rejection. Remove only policy violations such as private information, harassment, spam or unrelated content. Record a specific reason; authors can see it.'
          : 'Reply respectfully to the published review. Do not include private guest details. Reporting a review does not remove it or change its rating.'}
      </p>
      <ul className="space-y-5">
        {data.rows.map((r) => (
          <li key={r.id} className="space-y-3 rounded border border-border p-4">
            <h2 className="font-semibold">
              {r.title} · {r.rating} out of 5
            </h2>
            <p>Status: {r.moderation_state}</p>
            <p className="whitespace-pre-wrap break-words">{r.body}</p>
            {r.owner_reply ? <p>Owner reply: {r.owner_reply}</p> : null}
            <ReviewControl
              key={`${r.id}-${r.version}`}
              kind={admin ? 'moderate' : 'reply'}
              id={r.id}
              version={r.version}
              body={admin ? '' : r.owner_reply || ''}
            />
            {!admin ? (
              <details>
                <summary className="min-h-11 cursor-pointer">Report review or reply</summary>
                <ReviewControl kind="ownerReport" id={r.id} />
              </details>
            ) : null}
          </li>
        ))}
      </ul>
      {!data.rows.length ? <p>No reviews on this page.</p> : null}
      <nav className="flex gap-4">
        {data.page > 1 ? <Link href={`?page=${data.page - 1}`}>Previous</Link> : null}
        <span>Page {data.page}</span>
        {data.hasNext ? <Link href={`?page=${data.page + 1}`}>Next</Link> : null}
      </nav>
      {admin ? (
        <section className="space-y-4">
          <h2 className="text-h3">Open reports</h2>
          <p>
            The oldest 30 reports are shown. Closing one reveals the next. A report alone never
            hides a review. Use its publication decision above if removal is justified.
          </p>
          {data.reports.map((r) => (
            <div key={r.id} className="space-y-3 rounded border border-border p-4">
              <p className="break-all">Review {r.review_id}</p>
              <p>
                {r.rating} out of 5 · {r.body}
              </p>
              <p>Report: {r.reason}</p>
              <ReviewControl kind="moderate" id={r.review_id} version={r.version} />
              <ReviewControl kind="resolve" id={r.id} />
            </div>
          ))}
        </section>
      ) : null}
    </section>
  );
}
