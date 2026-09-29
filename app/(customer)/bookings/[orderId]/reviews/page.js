import { notFound } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { CustomerReviewForm } from '@/components/customer/ReviewForms';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBadge } from '@/components/customer/BookingDisplay';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { Star } from 'lucide-react';
export const metadata = { title: 'Review your visit', robots: { index: false, follow: false } };
export default async function Reviews({ params }) {
  let data;
  try {
    data = await customerApi.reviewForOrder((await params).orderId);
  } catch (e) {
    if (e instanceof ApiError && [400, 403, 404].includes(e.status)) notFound();
    throw e;
  }
  const eligible = data.visits.filter((v) => v.eligible && !v.review_id);
  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        className="mb-2"
        back={{ href: `/bookings/${data.id}`, label: 'Back to booking' }}
        title="Review your visit"
        description="Reviews require a real completed visit with recorded handover, return and completion. Cancelled, incomplete and simulation visits cannot be reviewed."
      />
      {eligible.length ? (
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <CustomerReviewForm visits={eligible} />
        </div>
      ) : (
        <EmptyState icon={Star} title="No unreviewed eligible visits in this booking." />
      )}
      <ul className="space-y-3">
        {data.visits
          .filter((v) => v.review_id)
          .map((v) => (
            <li key={v.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold">
                  {v.date ? formatLocalDate(v.date, { year: 'numeric' }) : 'Visit'} ·{' '}
                  <Star className="size-4 fill-current text-warning" aria-hidden="true" />
                  {v.rating} out of 5
                </h2>
                <StateBadge state={v.moderation_state}>Status: {v.moderation_state}</StateBadge>
              </div>
              <p className="whitespace-pre-wrap wrap-break-word text-ink-800">{v.body}</p>
              {v.moderation_reason ? (
                <p className="text-meta text-ink-600">Moderation reason: {v.moderation_reason}</p>
              ) : null}
            </li>
          ))}
      </ul>
    </section>
  );
}
