/* eslint-disable @next/next/no-img-element -- owner thumbnails come from Cloudinary or seed hosts. */
import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight, Building2, CalendarDays, MapPin, Star, Users } from 'lucide-react';
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
      href: `${listing.resumeStep ? stepHref(listing.id, listing.resumeStep) : `${base}/setup`}${keep}`,
    };
  if (listing.status === 'live' && listing.bookable === false)
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
    <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => {
        const cover = listing.cover ? publicPhotoUrl(listing.cover) : null;
        const title = propertyTitle(listing.title);
        const state = next(listing, keep);
        const place =
          listing.areaName && listing.cityName
            ? `${listing.areaName}, ${listing.cityName}`
            : listing.cityName || listing.areaName || 'Location not set';
        return (
          <li
            key={listing.id}
            className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-ink-300"
          >
            <Link
              href={`/partner/listings/${listing.id}/overview${keep}`}
              className="relative block overflow-hidden"
              aria-label={`View ${title}`}
            >
              {cover ? (
                <img
                  src={cover.replace(
                    '/image/upload/',
                    '/image/upload/c_fill,w_720,h_450,f_auto,q_auto/',
                  )}
                  alt=""
                  className="aspect-[8/5] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex aspect-[8/5] w-full flex-col items-center justify-center gap-3 bg-ink-100 text-ink-500">
                  <Building2 className="size-8" aria-hidden="true" />
                  <span className="text-meta">Add your property photos</span>
                </span>
              )}
              <span className="absolute top-3 left-3 rounded-full bg-card p-1">
                <ListingStatusBadge status={listing.status} reviewOutcome={listing.reviewOutcome} />
              </span>
            </Link>
            <div className="flex flex-1 flex-col p-5">
              <p className="mb-2 text-tiny text-ink-500">
                {listing.publicCode
                  ? `Property ${listing.publicCode}`
                  : listing.status === 'draft'
                    ? 'Draft property'
                    : 'Property'}
              </p>
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/partner/listings/${listing.id}/overview${keep}`}
                  className="min-w-0 text-h4 leading-snug font-bold text-ink-900 hover:text-brand-700"
                >
                  {title}
                </Link>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-ink-500" aria-hidden="true" />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-meta text-ink-500">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {place}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-tiny text-ink-600">
                {listing.capacity ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden="true" />
                    {listing.capacity} guests
                  </span>
                ) : null}
                {listing.resourceCount ? (
                  <span>
                    {listing.resourceCount} courts
                    {listing.maxPlayers ? ` · ${listing.maxPlayers} players` : ''}
                  </span>
                ) : null}
                {listing.ratingAvg ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="size-3.5 text-amber-700" aria-hidden="true" />
                    {Number(listing.ratingAvg).toFixed(1)} ({listing.reviewCount ?? 0})
                  </span>
                ) : null}
              </div>
              {listing.strength != null ? (
                <div className="mt-4">
                  <p className="flex justify-between text-tiny text-ink-500">
                    <span>Property strength</span>
                    <strong className="font-semibold text-ink-800 tabular">
                      {listing.strength}%
                    </strong>
                  </p>
                  <div className="mt-2 h-1 rounded-full bg-ink-100" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${Math.max(0, Math.min(100, listing.strength))}%` }}
                    />
                  </div>
                </div>
              ) : null}
              <div className="mt-auto pt-5">
                {state.line ? (
                  <p
                    className={`mb-3 flex items-start gap-2 text-meta ${listing.status === 'rejected' || (listing.status === 'live' && listing.bookable === false) ? 'text-warning' : 'text-ink-600'}`}
                  >
                    <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {state.line}
                  </p>
                ) : null}
                <Link
                  href={state.href}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-full bg-brand-50 px-4 text-meta font-semibold text-brand-800 hover:bg-brand-100"
                >
                  {state.action}
                  <span className="sr-only">: {title}</span>
                  <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
                </Link>
                {listing.updatedAt ? (
                  <p className="mt-3 text-tiny text-ink-500">
                    Updated{' '}
                    <time dateTime={listing.updatedAt}>
                      {new Date(listing.updatedAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </time>
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
