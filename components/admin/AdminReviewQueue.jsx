import Link from 'next/link';
import { Flag, MessageSquareWarning, ShieldCheck, Star } from 'lucide-react';
import { ReviewControl } from '@/components/customer/ReviewForms';
import {
  AdminEmpty,
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
        eyebrow="Trust and safety"
        title="Customer review moderation"
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
          label="Pending"
          value={pending}
          hint="Awaiting a publication decision"
          icon={ShieldCheck}
          tone={pending ? 'warning' : 'neutral'}
        />
        <AdminKpiCard
          label="Published"
          value={published}
          hint="Visible customer feedback"
          icon={Star}
          tone="brand"
        />
        <AdminKpiCard
          label="Open reports"
          value={data.reports.length}
          hint="Reports requiring resolution"
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
        {data.rows.length ? (
          <ul className="divide-y divide-border">
            {data.rows.map((review) => (
              <li key={review.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ink-900">{review.title}</h3>
                    <StatusBadge tone={tone(review.moderation_state)}>
                      {review.moderation_state}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-tiny font-semibold text-amber-700">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)} · {review.rating}/5
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-meta leading-6 text-ink-700">
                    {review.body}
                  </p>
                  {review.owner_reply ? (
                    <div className="mt-4 rounded-md bg-ink-50 p-3">
                      <p className="text-tiny font-bold text-ink-700">Owner reply</p>
                      <p className="mt-1 text-meta text-ink-600">{review.owner_reply}</p>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-border bg-ink-25 p-4">
                  <ReviewControl
                    key={`${review.id}-${review.version}`}
                    kind="moderate"
                    id={review.id}
                    version={review.version}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty
            icon={MessageSquareWarning}
            title="No reviews on this page"
            description="New customer reviews will appear here for a consistent publication decision."
          />
        )}
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
                  <p className="font-mono text-[0.68rem] text-ink-500">Review {report.review_id}</p>
                  <p className="mt-2 text-meta font-semibold text-ink-900">
                    {report.rating}/5 · {report.body}
                  </p>
                  <p className="mt-4 rounded-md bg-danger-bg p-3 text-meta text-danger">
                    <strong>Report:</strong> {report.reason}
                  </p>
                </div>
                <div className="space-y-4">
                  <ReviewControl kind="moderate" id={report.review_id} version={report.version} />
                  <ReviewControl kind="resolve" id={report.id} />
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
