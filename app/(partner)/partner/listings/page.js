import Link from 'next/link';
import { Building2, CircleAlert, Clock3, Eye } from 'lucide-react';
import { requireActiveClient } from '@/lib/auth/dal';
import {
  getClientListingSummary,
  getClientListingsPage,
} from '@/lib/db/listing-queries';
import CreateListingButton from '@/components/partner/CreateListingButton';
import PropertyFilters from '@/components/partner/PropertyFilters';
import PropertyTable from '@/components/partner/PropertyTable';
import { KpiCard, PartnerPageHeader } from '@/components/partner/PortalPrimitives';

export const metadata = {
  title: 'Your properties',
  robots: { index: false, follow: false, nocache: true },
};

const FILTERS = new Set(['all', 'live', 'review', 'attention', 'paused', 'hidden']);

function pageHref({ query, status, page }) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (status !== 'all') params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const suffix = params.toString();
  return suffix ? `/partner/listings?${suffix}` : '/partner/listings';
}

export default async function ListingsPage({ searchParams }) {
  const user = await requireActiveClient();
  const params = await searchParams;
  const query = typeof params?.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const status = FILTERS.has(params?.status) ? params.status : 'all';
  const requestedPage = Number.parseInt(params?.page, 10) || 1;

  const [summary, result] = await Promise.all([
    getClientListingSummary(user.id),
    getClientListingsPage(user.id, {
      query,
      status,
      page: requestedPage,
      pageSize: 10,
    }),
  ]);

  const first = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const last = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {params?.submitted ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-success-bg p-4 text-meta text-brand-900">
          <span className="mt-0.5 size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <p>
            <strong className="font-bold">Property submitted.</strong>{' '}
            We check every property before it goes live and will reply within 2 working days by email and WhatsApp.
          </p>
        </div>
      ) : null}

      <PartnerPageHeader
        eyebrow="Portfolio"
        title="Properties"
        description="Search, review and manage every Rentra property from one place."
        action={<CreateListingButton />}
      />

      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Property summary">
        <KpiCard
          label="Total properties"
          value={summary.total}
          hint="Every property in your portfolio"
          icon={Building2}
        />
        <KpiCard
          label="Live"
          value={summary.live}
          hint="Visible and bookable by guests"
          icon={Eye}
          tone="success"
        />
        <KpiCard
          label="In review"
          value={summary.inReview}
          hint="Being checked by Rentra"
          icon={Clock3}
          tone="warning"
        />
        <KpiCard
          label="Needs attention"
          value={summary.attention}
          hint="Drafts or requested changes"
          icon={CircleAlert}
          tone={summary.attention > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs" aria-labelledby="property-list-title">
        <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 id="property-list-title" className="text-h4 font-bold text-ink-900">All properties</h2>
            <p className="mt-0.5 text-tiny text-ink-500">
              {result.total === summary.total
                ? `${result.total} ${result.total === 1 ? 'property' : 'properties'}`
                : `${result.total} matching ${summary.total} total`}
            </p>
          </div>
          <p className="text-tiny text-ink-500">Updated properties appear first</p>
        </div>

        <PropertyFilters query={query} status={status} />
        <PropertyTable
          listings={result.items}
          emptyTitle={summary.total ? 'No matching properties' : 'No properties yet'}
          emptyDescription={summary.total
            ? 'Try a different search or clear the current status filter.'
            : 'Use “Add property” to create your first listing.'}
        />

        <div className="flex flex-col gap-3 border-t border-border bg-ink-25/70 px-4 py-3 text-tiny text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p>
            Showing <strong className="font-semibold text-ink-800 tabular">{first}</strong> to{' '}
            <strong className="font-semibold text-ink-800 tabular">{last}</strong> of{' '}
            <strong className="font-semibold text-ink-800 tabular">{result.total}</strong>
          </p>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Link
                href={pageHref({ query, status, page: result.page - 1 })}
                scroll={false}
                className="rounded-sm border border-border bg-card px-3 py-2 font-semibold text-ink-700 hover:bg-ink-50"
              >
                ← Previous
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-sm border border-border px-3 py-2 text-ink-400">← Previous</span>
            )}

            <span className="grid min-h-8 min-w-8 place-items-center rounded-sm bg-brand-600 px-2 font-bold text-white tabular">
              {result.page}
            </span>

            {result.page < result.totalPages ? (
              <Link
                href={pageHref({ query, status, page: result.page + 1 })}
                scroll={false}
                className="rounded-sm border border-border bg-card px-3 py-2 font-semibold text-ink-700 hover:bg-ink-50"
              >
                Next →
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-sm border border-border px-3 py-2 text-ink-400">Next →</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
