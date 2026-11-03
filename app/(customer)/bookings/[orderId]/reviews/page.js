import { notFound } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { CustomerReviewForm } from '@/components/customer/ReviewForms';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBadge } from '@/components/customer/BookingDisplay';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { Star } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { REVIEW_CHECKING_MESSAGE, EXPERIENCE_SCOPE_LABELS } from '@/lib/domain/status';
import { listingPath } from '@/lib/domain/listing-url';
export const metadata = { title: 'Review your visit', robots: { index: false, follow: false } };
export default async function Reviews({ params }) {
  let data;
  try {
    data = await customerApi.reviewForOrder((await params).orderId);
  } catch (e) {
    if (e instanceof ApiError && [400, 403, 404].includes(e.status)) notFound();
    throw e;
  }
  const open = data.visits.filter((v) => v.eligible && !v.review_id);
  const eligible = open.filter((v) => !v.experience_scope);
  // Story 5.2: visits with an approved arrival exception get their own scoped form each.
  const arrivals = open.filter((v) => v.experience_scope);
  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        className="mb-2"
        back={{ href: `/bookings/${data.id}`, label: 'Back to booking' }}
        title="Review your visit"
        description="Review visits you completed in the last 30 days. Cancelled, no-show and test visits can't be reviewed unless Rentra approved an arrival review."
      />
      {arrivals.map((v) => (
        <div key={v.id} className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-h4 font-bold">Review your arrival</h2>
          <CustomerReviewForm
            visits={[v]}
            scope={v.experience_scope}
            listingHref={listingPath(data.listing_slug, data.listing_code)}
          />
        </div>
      ))}
      {eligible.length ? (
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <CustomerReviewForm
            visits={eligible}
            listingHref={listingPath(data.listing_slug, data.listing_code)}
          />
        </div>
      ) : arrivals.length ? null : (
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
                <StateBadge domain="review" state={v.moderation_state} />
              </div>
              {v.experience_scope ? (
                <p className="text-meta font-semibold text-ink-600">
                  {EXPERIENCE_SCOPE_LABELS[v.experience_scope]}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap wrap-break-word text-ink-800">{v.body}</p>
              {v.moderation_state === 'published' ? (
                <Link
                  className="inline-flex min-h-11 items-center text-meta underline"
                  href={listingPath(data.listing_slug, data.listing_code)}
                >
                  Your review is live — see it on the listing
                </Link>
              ) : v.moderation_state === 'pending' ? (
                <p className="text-meta text-ink-600">{REVIEW_CHECKING_MESSAGE}</p>
              ) : v.moderation_reason && !v.moderation_reason.startsWith('auto:') ? (
                <p className="text-meta text-ink-600">Moderation reason: {v.moderation_reason}</p>
              ) : null}
            </li>
          ))}
      </ul>
    </section>
  );
}
