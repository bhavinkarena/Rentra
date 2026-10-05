import Link from '@/components/navigation/NavigationLink';
import { Flag, MessageSquareWarning, ShieldCheck, Star } from 'lucide-react';
import {
  AdminEmpty,
  AdminTable,
  AdminKpiCard,
  AdminPage,
  AdminPageHeader,
  Pager,
  StatusBadge,
} from './AdminPrimitives';

function tone(state) {
  if (state === 'published') return 'success';
  if (['rejected', 'hidden'].includes(state)) return 'danger';
  return 'warning';
}

export default function AdminReviewQueue({ data }) {
  const pending = data.rows.filter((row) => row.moderation_state === 'pending').length;
  const published = data.rows.filter((row) => row.moderation_state === 'published').length;
  return (
    <AdminPage>
      <AdminPageHeader
        title="Guest reviews"
        description="Apply the same publication rules to every score. Remove only policy violations such as private information, harassment, spam, or unrelated content."
      />
      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Review summary">
        <AdminKpiCard
          label="On this page"
          value={data.rows.length}
          hint="Reviews loaded for moderation"
          icon={Star}
        />
        <AdminKpiCard
          label="Pending on page"
          value={pending}
          hint="Awaiting a decision on this page"
          icon={ShieldCheck}
          tone={pending ? 'warning' : 'neutral'}
        />
        <AdminKpiCard
          label="Published on page"
          value={published}
          hint="Visible customer feedback"
          icon={Star}
          tone="brand"
        />
        <AdminKpiCard
          label="Loaded open reports"
          value={data.reports.length}
          hint="Reports returned by the current queue"
          icon={Flag}
          tone={data.reports.length ? 'danger' : 'neutral'}
        />
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-h4 font-bold text-ink-900">Review queue</h2>
          <p className="mt-1 text-tiny text-ink-500">
            Moderation reasons are shared with the author
          </p>
        </div>
        <AdminTable
          framed={false}
          label="Guest reviews"
          columns={['Property and score', 'Feedback', 'Moderation', 'Review']}
          empty={
            !data.rows.length && (
              <AdminEmpty
                icon={MessageSquareWarning}
                title="No reviews on this page"
                description="New guest feedback will appear here."
              />
            )
          }
        >
          {data.rows.map((review) => (
            <tr key={review.id}>
              <td className="px-4 py-4">
                <p className="font-semibold">{review.title}</p>
                <p>{review.rating} out of 5</p>
              </td>
              <td className="max-w-md px-4 py-4">
                <p className="whitespace-pre-wrap break-words">{review.body}</p>
                {review.owner_reply && (
                  <p className="mt-3 whitespace-pre-wrap break-words">
                    <strong>Owner reply: </strong>
                    {review.owner_reply}
                  </p>
                )}
              </td>
              <td className="px-4 py-4">
                <StatusBadge tone={tone(review.moderation_state)}>
                  {review.moderation_state}
                </StatusBadge>
              </td>
              <td className="px-4 py-4">
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href={`/admin/reviews/${review.id}?from=${encodeURIComponent(`/admin/reviews?page=${data.page}`)}`}
                >
                  View<span className="sr-only"> review of {review.title}</span>
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
        <footer className="flex justify-end border-t border-border px-5 py-4">
          <Pager
            page={data.page}
            hasNext={data.hasNext}
            previousHref={`?page=${data.page - 1}`}
            nextHref={`?page=${data.page + 1}`}
          />
        </footer>
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-h4 font-bold text-ink-900">Open reports</h2>
          <p className="mt-1 text-tiny text-ink-500">
            A report alone never hides a review; record both decisions separately.
          </p>
        </div>
        {data.reports.length ? (
          <div className="divide-y divide-border">
            {data.reports.map((report) => (
              <article key={report.id} className="grid gap-5 p-5 lg:grid-cols-2">
                <div>
                  <p className="font-mono text-tiny text-ink-500">Review {report.review_id}</p>
                  <p className="mt-2 text-meta font-semibold text-ink-900">
                    {report.rating}/5 · {report.body}
                  </p>
                  <p className="mt-4 rounded-md bg-danger-bg p-3 text-meta text-danger">
                    <strong>Report:</strong> {report.reason}
                  </p>
                </div>
                <div className="space-y-4">
                  <Link
                    className="inline-flex min-h-11 items-center underline"
                    href={`/admin/reviews/${report.review_id}?from=${encodeURIComponent(`/admin/reviews?page=${data.page}`)}#report-${report.id}`}
                  >
                    Report detail and resolution
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmpty
            icon={Flag}
            title="No open reports"
            description="Reported reviews that need investigation will appear here."
          />
        )}
      </section>
    </AdminPage>
  );
}
