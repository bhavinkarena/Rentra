/* eslint-disable @next/next/no-img-element -- owner thumbnails come from Cloudinary or seed hosts. */
import Link from '@/components/navigation/NavigationLink';
import { Building2 } from 'lucide-react';
import ListingStatusBadge from '@/components/partner/ListingStatusBadge';
import { publicPhotoUrl } from '@/lib/domain/listing-content';
import { stepHref } from '@/lib/domain/listing-steps';
import { propertyTitle } from '@/components/partner/property/PropertyHub';

const SLOT = {
  day: 'Day picnic',
  night: 'Night stay',
  full_day: 'Full day',
  hourly: 'Court booking',
};

function visitLine(visit) {
  if (!visit) return null;
  const date = new Date(`${String(visit.day).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString(
    'en-IN',
    { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' },
  );
  return `Next: ${date} · ${SLOT[visit.slot] ?? visit.slot}`;
}

/** The state line and the one action that fits it (PROP-04). */
function next(listing, keep) {
  const base = `/partner/listings/${listing.id}`;
  const sentBack =
    listing.status === 'rejected' ||
    (listing.status === 'draft' && listing.reviewOutcome === 'changes_requested');
  if (sentBack)
    return {
      line: listing.rejectionReason || 'Rentra asked for changes',
      action: 'Fix',
      href: `${base}/overview${keep}`,
    };
  if (listing.status === 'draft')
    return {
      line: 'Not submitted yet',
      action: listing.resumeNumber
        ? `Continue setup — step ${listing.resumeNumber} of ${listing.stepTotal}`
        : 'Continue setup',
      href: listing.resumeStep ? stepHref(listing.id, listing.resumeStep) : `${base}/setup`,
    };
  if (listing.status === 'live' && !listing.bookable)
    return {
      line: 'Live, no open dates',
      action: 'Open calendar',
      href: `${base}/calendar${keep}`,
    };
  if (listing.status === 'live')
    return {
      line: visitLine(listing.nextVisit) ?? 'No upcoming visits',
      action: 'Open calendar',
      href: `${base}/calendar${keep}`,
    };
  return {
    line: visitLine(listing.nextVisit) ?? null,
    action: 'View',
    href: `${base}/overview${keep}`,
  };
}

export default function PropertyCards({ listings, from }) {
  const keep = from ? `?from=${encodeURIComponent(from)}` : '';
  return (
    <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
      {listings.map((listing) => {
        const cover = listing.cover ? publicPhotoUrl(listing.cover) : null;
        const title = propertyTitle(listing.title);
        const state = next(listing, keep);
        const place =
          listing.areaName && listing.cityName
            ? `${listing.areaName}, ${listing.cityName}`
            : listing.cityName || 'Location not set';
        return (
          <li
            key={listing.id}
            className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
          >
            {cover ? (
              <img
                src={cover.replace(
                  '/image/upload/',
                  '/image/upload/c_fill,w_480,h_270,f_auto,q_auto/',
                )}
                alt=""
                className="aspect-video w-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid aspect-video w-full place-items-center bg-brand-50 text-brand-700"
              >
                <Building2 className="size-8" />
              </span>
            )}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/partner/listings/${listing.id}/overview${keep}`}
                  className="min-w-0 text-meta font-bold text-ink-900 hover:underline"
                >
                  {title}
                </Link>
                <ListingStatusBadge status={listing.status} reviewOutcome={listing.reviewOutcome} />
              </div>
              <p className="text-tiny text-ink-500">{place}</p>
              {state.line ? <p className="text-tiny text-ink-700">{state.line}</p> : null}
              {listing.strength != null ? (
                <p className="text-tiny text-ink-500">
                  Strength{' '}
                  <strong className="font-semibold text-ink-800">{listing.strength}%</strong>
                </p>
              ) : null}
              <Link
                href={state.href}
                className="mt-auto inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-tiny font-semibold text-brand-700 hover:bg-ink-50"
              >
                {state.action}
                <span className="sr-only">: {title}</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
