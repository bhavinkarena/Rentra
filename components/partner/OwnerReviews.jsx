import { Star, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { EmptyState } from '@/components/ui/empty-state';
import ReviewCard, { ReviewStars } from './reviews/ReviewCard';

export default function OwnerReviews({ data, embedded = false }) {
  const Heading = embedded ? 'h2' : 'h1',
    Subheading = embedded ? 'h3' : 'h2';
  const count = data.stats?.count ?? 0,
    average = data.stats?.average,
    unanswered = data.tab === 'needs_reply';
  return (
    <section
      className={
        embedded
          ? 'owner-reviews space-y-5'
          : 'owner-reviews mx-auto w-full max-w-(--container-workspace) min-w-0 space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8'
      }
    >
      <header>
        <Heading className={`${embedded ? 'text-h2' : 'text-h1'} font-bold text-ink-900`}>
          {embedded ? 'Guest reviews' : 'Reviews'}
        </Heading>
        <p className="mt-2 text-meta text-ink-600">
          Read your guests’ experiences and keep the conversation going.
        </p>
      </header>
      <section
        aria-label="Public review overview"
        className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border border-border bg-card px-5 py-5 sm:px-6"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-4xl font-semibold tracking-[-0.035em] text-ink-900 tabular">
            {count && average != null ? Number(average).toFixed(1) : '—'}
            <span className="ml-1 text-meta font-normal tracking-normal text-ink-500">/ 5</span>
          </p>
          <div>
            {count && average != null ? (
              <span className="hidden sm:inline-flex">
                <ReviewStars rating={average} />
              </span>
            ) : (
              <Star className="hidden size-5 text-ink-400 sm:block" aria-hidden="true" />
            )}
            <p className="text-tiny text-ink-500 sm:mt-1">Public rating</p>
          </div>
        </div>
        <div className="border-l border-border pl-6">
          <p className="text-h3 font-semibold text-ink-800 tabular">
            {count.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-tiny text-ink-500">
            Public {count === 1 ? 'review' : 'reviews'}
            {embedded ? ' for this property' : ''}
          </p>
        </div>
      </section>
      <section
        className="overflow-hidden rounded-lg border border-border bg-card"
        aria-labelledby="reviews-inbox-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 pt-5 sm:px-6">
          <Subheading id="reviews-inbox-title" className="pb-3 text-h4 font-semibold text-ink-900">
            Guest feedback
          </Subheading>
          <nav aria-label="Review filters" className="flex gap-1">
            {[
              ['needs_reply', 'Needs reply'],
              ['all', 'All reviews'],
            ].map(([tab, label]) => (
              <Link
                key={tab}
                href={`?tab=${tab}`}
                aria-current={data.tab === tab ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-meta font-semibold ${data.tab === tab ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-500 hover:text-ink-800'}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        {data.rows.length ? (
          <div className="divide-y divide-border">
            {data.rows.map((r) => (
              <ReviewCard key={`${r.id}-${r.version}`} review={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={unanswered ? MessageSquare : Star}
            title={
              data.page > 1
                ? 'No reviews on this page'
                : unanswered
                  ? 'You’re all caught up'
                  : 'Your first review starts here'
            }
            description={
              unanswered
                ? 'No reviews on this page need a reply. You can still read previous feedback and your replies.'
                : 'Guests can leave feedback after a completed visit. Their published reviews will appear here.'
            }
            actionHref={unanswered ? '?tab=all' : undefined}
            actionLabel="Read all reviews"
          />
        )}
        {data.page > 1 || data.hasNext ? (
          <nav
            aria-label="Review pages"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6"
          >
            <span className="text-tiny text-ink-500">Page {data.page}</span>
            <div className="flex gap-2">
              {data.page > 1 ? (
                <Link
                  href={`?tab=${data.tab}&page=${data.page - 1}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-meta font-medium text-ink-700 hover:bg-ink-50"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Previous
                </Link>
              ) : null}
              {data.hasNext ? (
                <Link
                  href={`?tab=${data.tab}&page=${data.page + 1}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-meta font-medium text-ink-700 hover:bg-ink-50"
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
      <p className="text-tiny leading-5 text-ink-500">
        Replies are public. Keep guest contact details private; reporting a review does not change
        its rating.
      </p>
    </section>
  );
}
