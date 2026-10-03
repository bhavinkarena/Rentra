import OwnerTable from './OwnerTable';
import { EmptyState } from '@/components/ui/empty-state';
import { Star } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import OwnerReviewReply from './OwnerReviewReply';
import { ReviewControl } from '@/components/customer/ReviewForms';
const date = (value) =>
  new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
export default function OwnerReviews({ data, embedded = false }) {
  const Heading = embedded ? 'h2' : 'h1';
  return (
    <section className={embedded ? 'space-y-5' : 'mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6'}>
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
        <EmptyState
          icon={Star}
          title={data.tab === 'needs_reply' ? 'No reviews need a reply' : 'No reviews yet'}
          description="Guests can review after a completed visit. Replying builds trust."
          actionHref={data.tab === 'needs_reply' ? '?tab=all' : undefined}
          actionLabel="Show all reviews"
        />
      )}
      <OwnerTable
        label="Guest reviews"
        columns={['Property / guest', 'Rating', 'Visit', 'Review', 'Reply status', 'Action']}
        empty={!data.rows.length ? 'No reviews in this view.' : null}
      >
        {data.rows.map((r) => (
          <tr key={r.id}>
            <td>
              <strong className="block">{r.title}</strong>
              <span className="block text-tiny text-ink-600">
                {r.guest_first_name} · {date(r.created_at)}
              </span>
            </td>
            <td className="whitespace-nowrap">
              <span aria-label={`${r.rating} out of 5 stars`}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </span>
            </td>
            <td>
              <span className="block whitespace-nowrap">{r.visit_date}</span>
              <span className="text-tiny">{r.visit_reference}</span>
            </td>
            <td className="max-w-72">
              <p className="line-clamp-3 whitespace-pre-wrap wrap-break-word">{r.body}</p>
            </td>
            <td>
              <span
                className={`whitespace-nowrap rounded-full px-2 py-1 text-tiny ${r.owner_reply ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}
              >
                {r.owner_reply ? 'Replied' : 'Needs reply'}
              </span>
            </td>
            <td className="min-w-64 space-y-3">
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold text-brand-800"
                href={`/partner/reviews/${r.id}`}
              >
                View details
              </Link>
              {r.moderation_state === 'published' && (
                <details>
                  <summary className="min-h-11 cursor-pointer content-center font-semibold">
                    {r.owner_reply ? 'Manage reply' : 'Reply'}
                  </summary>
                  <OwnerReviewReply key={r.version} review={r} />
                </details>
              )}
              {r.reported_at ? (
                <p className="text-tiny">Reported {date(r.reported_at)}</p>
              ) : (
                <details>
                  <summary className="min-h-11 cursor-pointer content-center">
                    Report review
                  </summary>
                  <p className="text-tiny">
                    Reporting does not remove a review or change its rating.
                  </p>
                  <ReviewControl kind="ownerReport" id={r.id} />
                </details>
              )}
            </td>
          </tr>
        ))}
      </OwnerTable>
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
