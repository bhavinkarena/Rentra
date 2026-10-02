import Link from '@/components/navigation/NavigationLink';
import OwnerReviewReply from './OwnerReviewReply';
import { ReviewControl } from '@/components/customer/ReviewForms';
const date = (value) =>
  new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
export default function OwnerReviews({ data, embedded = false }) {
  const Heading = embedded ? 'h2' : 'h1';
  return (
    <section className={embedded ? 'space-y-5' : 'mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6'}>
      <Heading className="text-h2">Guest reviews</Heading>
      <p>
        {data.stats?.average ?? '—'} out of 5 · {data.stats?.count ?? 0} reviews
      </p>
      <nav aria-label="Review filters" className="flex gap-3">
        {[
          ['needs_reply', 'Needs reply'],
          ['all', 'All'],
        ].map(([tab, label]) => (
          <Link
            key={tab}
            className="min-h-11 inline-flex items-center rounded-full border px-4"
            aria-current={data.tab === tab ? 'page' : undefined}
            href={`?tab=${tab}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!data.rows.length && (
        <div className="rounded-lg border p-6">
          <Heading className="text-h3">
            {data.tab === 'needs_reply' ? 'No reviews need a reply' : '⭐ No reviews yet'}
          </Heading>
          <p>
            Guests can review after their visit is completed. Replying to reviews helps future
            guests trust you.
          </p>
        </div>
      )}
      <ul className="space-y-5">
        {data.rows.map((r) => (
          <li key={r.id} className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">
              {r.title} ·{' '}
              <span aria-label={`${r.rating} out of 5 stars`}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </span>
            </h3>
            <p className="text-sm text-ink-600">
              {r.guest_first_name} · {date(r.created_at)} · Visit {r.visit_date} ·{' '}
              {r.visit_reference}
            </p>
            <p className="line-clamp-4 whitespace-pre-wrap wrap-break-word">{r.body}</p>
            {r.moderation_state === 'published' && <OwnerReviewReply key={r.version} review={r} />}
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/partner/reviews/${r.id}`}
            >
              Review detail and history
            </Link>
            {r.reported_at ? (
              <p>Already reported on {date(r.reported_at)}.</p>
            ) : (
              <details>
                <summary className="min-h-11 cursor-pointer">Report this review</summary>
                <p>Reporting does not remove a review or change its rating.</p>
                <ReviewControl kind="ownerReport" id={r.id} />
              </details>
            )}
          </li>
        ))}
      </ul>
      {(data.page > 1 || data.hasNext) && (
        <nav className="flex gap-4" aria-label="Review pages">
          {data.page > 1 && <Link href={`?tab=${data.tab}&page=${data.page - 1}`}>Previous</Link>}
          <span>Page {data.page}</span>
          {data.hasNext && <Link href={`?tab=${data.tab}&page=${data.page + 1}`}>Next</Link>}
        </nav>
      )}
    </section>
  );
}
