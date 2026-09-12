import Link from 'next/link';
import { ArrowRight, Building2, Star } from 'lucide-react';
import ListingStatusBadge from '@/components/partner/ListingStatusBadge';

function displayTitle(title) {
  return title === 'Untitled property' ? 'Untitled draft' : title;
}

function displayLocation(listing) {
  if (listing.areaName && listing.cityName) return `${listing.areaName}, ${listing.cityName}`;
  return listing.cityName || listing.areaName || 'Location not set';
}

function displayDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

function actionLabel(status) {
  if (status === 'draft') return 'Continue setup';
  if (status === 'rejected') return 'Fix listing';
  return 'Manage';
}

function actionHref(listing) {
  const base = `/partner/listings/${listing.id}`;
  return listing.status === 'draft' || listing.status === 'rejected'
    ? `${base}/setup`
    : base;
}

function PropertyIdentity({ listing }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
        <Building2 className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-meta font-semibold text-ink-900">
          {displayTitle(listing.title)}
        </span>
        <span className="mt-0.5 block truncate text-[0.68rem] font-medium tracking-wide text-ink-500 uppercase">
          {listing.publicCode ? `ID ${listing.publicCode}` : 'Draft property'}
        </span>
      </span>
    </div>
  );
}

export default function PropertyTable({
  listings,
  compact = false,
  emptyTitle = 'No properties found',
  emptyDescription = 'Try a different search or status filter.',
}) {
  if (!listings.length) {
    return (
      <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
        <div>
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-ink-100 text-ink-500">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-meta font-semibold text-ink-900">{emptyTitle}</p>
          <p className="mt-1 text-tiny text-ink-500">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-ink-25/80">
              <th className="px-5 py-3 text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Property</th>
              <th className="px-4 py-3 text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Location</th>
              <th className="px-4 py-3 text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Status</th>
              {!compact ? (
                <>
                  <th className="px-4 py-3 text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Capacity</th>
                  <th className="px-4 py-3 text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Rating</th>
                </>
              ) : null}
              <th className="px-4 py-3 text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase">Updated</th>
              <th className="px-5 py-3 text-right text-[0.65rem] font-bold tracking-[0.1em] text-ink-500 uppercase"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listings.map((listing) => (
              <tr key={listing.id} className="group transition-colors hover:bg-ink-25">
                <td className="max-w-72 px-5 py-3.5">
                  <PropertyIdentity listing={listing} />
                  {listing.status === 'rejected' && listing.rejectionReason ? (
                    <p className="mt-2 max-w-64 truncate text-[0.68rem] text-danger" title={listing.rejectionReason}>
                      {listing.rejectionReason}
                    </p>
                  ) : null}
                </td>
                <td className="max-w-48 px-4 py-3.5 text-tiny text-ink-600">
                  <span className="block truncate" title={displayLocation(listing)}>{displayLocation(listing)}</span>
                </td>
                <td className="px-4 py-3.5"><ListingStatusBadge status={listing.status} /></td>
                {!compact ? (
                  <>
                    <td className="px-4 py-3.5 text-tiny text-ink-600 tabular">
                      {listing.capacity ? `${listing.capacity} guests` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-tiny text-ink-600 tabular">
                      {listing.ratingAvg ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-ink-800">
                          <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                          {listing.ratingAvg.toFixed(1)}
                          <span className="font-normal text-ink-400">({listing.reviewCount})</span>
                        </span>
                      ) : '—'}
                    </td>
                  </>
                ) : null}
                <td className="whitespace-nowrap px-4 py-3.5 text-tiny text-ink-500">
                  <time dateTime={new Date(listing.updatedAt).toISOString()}>{displayDate(listing.updatedAt)}</time>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={actionHref(listing)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-tiny font-semibold text-ink-700 transition-colors group-hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900"
                  >
                    {actionLabel(listing.status)}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {listings.map((listing) => (
          <li key={listing.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <PropertyIdentity listing={listing} />
              <ListingStatusBadge status={listing.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed border-border pt-3 text-tiny">
              <div>
                <dt className="text-ink-400">Location</dt>
                <dd className="mt-0.5 truncate font-medium text-ink-700">{displayLocation(listing)}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Updated</dt>
                <dd className="mt-0.5 font-medium text-ink-700">{displayDate(listing.updatedAt)}</dd>
              </div>
            </dl>
            <Link
              href={actionHref(listing)}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-tiny font-semibold text-ink-800"
            >
              {actionLabel(listing.status)}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
