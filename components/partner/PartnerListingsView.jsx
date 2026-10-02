import Link from '@/components/navigation/NavigationLink';
import { Building2 } from 'lucide-react';
import CreateListingButton from '@/components/partner/CreateListingButton';
import PropertyFilters from '@/components/partner/PropertyFilters';
import PropertyCards from '@/components/partner/PropertyCards';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';

function pageHref({ query, status, vertical, page }) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (status !== 'all') params.set('status', status);
  if (vertical) params.set('vertical', vertical);
  if (page > 1) params.set('page', String(page));
  const suffix = params.toString();
  return suffix ? `/partner/listings?${suffix}` : '/partner/listings';
}

export default function PartnerListingsView({ summary, result, args, submitted }) {
  const { query, status, vertical } = args;
  const first = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const last = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="mx-auto w-full max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {submitted ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-success-bg p-4 text-meta text-brand-900">
          <span className="mt-0.5 size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <p>
            <strong className="font-bold">Property submitted.</strong> Rentra checks every property
            before it goes live. The decision appears in this workspace.
          </p>
        </div>
      ) : null}

      <PartnerPageHeader
        eyebrow="Portfolio"
        title="Properties"
        description="Search, review and manage every Rentra property from one place."
        action={<CreateListingButton />}
      />

      {summary.total === 0 ? (
        <section className="mt-7 rounded-lg border border-border bg-card p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Building2 className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-h3 font-bold text-ink-900">
            You haven&apos;t added a property yet
          </h2>
          <p className="mx-auto mt-2 max-w-prose text-meta text-ink-600">
            Add your farmhouse or venue in about 15 minutes. You&apos;ll need 6 photos and your
            prices.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <CreateListingButton label="Add your first property" />
            <Link
              href="/partner/help"
              className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-meta font-semibold text-brand-700 hover:bg-ink-50"
            >
              What you&apos;ll need
            </Link>
          </div>
        </section>
      ) : (
        <section
          className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs"
          aria-labelledby="property-list-title"
        >
          <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 id="property-list-title" className="text-h4 font-bold text-ink-900">
                All properties
              </h2>
              <p className="mt-0.5 text-tiny text-ink-500">
                {result.total === summary.total
                  ? `${result.total} ${result.total === 1 ? 'property' : 'properties'}`
                  : `${result.total} matching ${summary.total} total`}
              </p>
            </div>
            <p className="text-tiny text-ink-500">Updated properties appear first</p>
          </div>

          <PropertyFilters
            key={`${query}:${status}:${vertical}`}
            query={query}
            status={status}
            vertical={vertical}
            verticals={summary.verticals ?? []}
            summary={summary}
          />
          {result.items.length ? (
            <PropertyCards
              listings={result.items}
              from={pageHref({ query, status, vertical, page: result.page })}
            />
          ) : (
            <p className="p-8 text-center text-meta text-ink-600">
              No properties match. Try another search or choose All.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-border bg-ink-25/70 px-4 py-3 text-tiny text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p>
              Showing <strong className="font-semibold text-ink-800 tabular">{first}</strong> to{' '}
              <strong className="font-semibold text-ink-800 tabular">{last}</strong> of{' '}
              <strong className="font-semibold text-ink-800 tabular">{result.total}</strong>
            </p>
            <div className="flex items-center gap-2">
              {result.page > 1 ? (
                <Link
                  href={pageHref({ query, status, vertical, page: result.page - 1 })}
                  scroll={false}
                  className="rounded-sm border border-border bg-card px-3 py-2 font-semibold text-ink-700 hover:bg-ink-50"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-sm border border-border px-3 py-2 text-ink-500">
                  ← Previous
                </span>
              )}

              <span className="grid min-h-8 min-w-8 place-items-center rounded-sm bg-primary px-2 font-bold text-white tabular">
                {result.page}
              </span>

              {result.page < result.totalPages ? (
                <Link
                  href={pageHref({ query, status, vertical, page: result.page + 1 })}
                  scroll={false}
                  className="rounded-sm border border-border bg-card px-3 py-2 font-semibold text-ink-700 hover:bg-ink-50"
                >
                  Next →
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-sm border border-border px-3 py-2 text-ink-500">
                  Next →
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
