/* eslint-disable @next/next/no-img-element -- owner thumbnails come from Cloudinary or seed hosts. */
import Link from '@/components/navigation/NavigationLink';
import { Building2, Camera, Eye } from 'lucide-react';
import Breadcrumbs from '@/components/portal/Breadcrumbs';
import ListingStatusBadge from '@/components/partner/ListingStatusBadge';
import ShareButton from '@/components/rentra/listing/ShareButton';
import { publicPhotoUrl } from '@/lib/domain/listing-content';
import PauseButton from './PauseButton';
import { siteUrl } from '@/lib/seo/site-url';

const TABS = [
  ['overview', 'Overview', (id) => `/partner/listings/${id}/overview`],
  ['edit', 'Edit', (id) => `/partner/listings/${id}`],
  ['calendar', 'Calendar', (id) => `/partner/listings/${id}/calendar`],
  ['photos', 'Photos', (id) => `/partner/listings/${id}/photos`],
  ['arrival', 'Arrival guide', (id) => `/partner/listings/${id}/arrival-guide`],
  ['reviews', 'Reviews', (id) => `/partner/listings/${id}/reviews`],
  ['activity', 'Activity', (id) => `/partner/listings/${id}/activity`],
];

const day = (value) =>
  new Date(`${value}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
  });

export const propertyTitle = (title) =>
  !title || title === 'Untitled property' ? 'Untitled draft' : title;

/**
 * The property hub (Phase 6 §6.1): one header and one tab bar over the
 * overview, editor, calendar, photos, reviews and activity routes, so every
 * part of a property is one tap away. `from` keeps the filtered list.
 */
export default function PropertyHub({
  listing,
  photos = [],
  active,
  listHref = '/partner/listings',
  publicPath = null,
  upcoming = 0,
  pausedUntil = null,
  ownerApproved = true,
}) {
  const keep = listHref === '/partner/listings' ? '' : `?from=${encodeURIComponent(listHref)}`;
  const cover = photos[0] ? publicPhotoUrl(photos[0]) : null;
  const title = propertyTitle(listing.title);
  const tabs = TABS.filter(([key]) => !['calendar', 'arrival'].includes(key) || ownerApproved);
  return (
    <header className="border-b border-border">
      <Breadcrumbs items={[{ href: listHref, label: 'Properties' }, { label: title }]} />
      {active === 'overview' ? (
        <Link
          href={`/partner/listings/${listing.id}/photos${keep}`}
          aria-label={`Manage photos for ${title}`}
          className="relative mt-5 block overflow-hidden rounded-lg bg-ink-100"
        >
          {cover ? (
            <div
              className={`grid h-52 gap-2 sm:h-72 lg:h-80 ${photos.length > 1 ? 'sm:grid-cols-[2fr_1fr]' : ''}`}
            >
              <img
                src={cover.replace(
                  '/image/upload/',
                  '/image/upload/c_fill,w_1200,h_600,f_auto,q_auto/',
                )}
                alt=""
                className="h-full min-h-0 w-full object-cover"
              />
              {photos.length > 1 ? (
                <div
                  className={`hidden min-h-0 gap-2 sm:grid ${photos.length > 2 ? 'grid-rows-2' : ''}`}
                >
                  {photos.slice(1, 3).map((photo, index) => (
                    <img
                      key={photo.id ?? index}
                      src={publicPhotoUrl(photo).replace(
                        '/image/upload/',
                        '/image/upload/c_fill,w_600,h_300,f_auto,q_auto/',
                      )}
                      alt=""
                      className="h-full min-h-0 w-full object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-52 flex-col items-center justify-center gap-3 text-ink-500 sm:h-72 lg:h-80">
              <Building2 className="size-10" aria-hidden="true" />
              <span className="text-meta">Bring your property to life with photos</span>
            </div>
          )}
          <span className="absolute right-4 bottom-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-meta font-semibold text-ink-900">
            <Camera className="size-4" aria-hidden="true" />
            {photos.length ? `Manage photos · ${photos.length}` : 'Add photos'}
          </span>
        </Link>
      ) : null}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        {active === 'overview' ? null : cover ? (
          <img
            src={cover.replace('/image/upload/', '/image/upload/c_fill,w_160,h_120,f_auto,q_auto/')}
            alt=""
            className="size-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-28"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 sm:h-20 sm:w-28"
          >
            <Building2 className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-1 text-h2 font-bold break-words text-ink-900">{title}</h1>
            <ListingStatusBadge status={listing.status} reviewOutcome={listing.reviewOutcome} />
          </div>
          {listing.publicCode ? (
            <p className="mt-1 text-tiny text-ink-500">Property ID {listing.publicCode}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/partner/listings/${listing.id}/preview`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
          >
            <Eye className="size-4" aria-hidden="true" /> Preview
          </Link>
          {publicPath ? (
            <ShareButton title={title} text={title} url={new URL(publicPath, siteUrl).toString()} />
          ) : null}
          {listing.status === 'live' ? <PauseButton listing={listing} upcoming={upcoming} /> : null}
        </div>
      </div>
      {listing.status === 'paused' ? (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/20 bg-info-bg p-3 text-meta text-ink-800"
        >
          <p>
            <strong className="font-semibold">Paused by you</strong>
            {pausedUntil ? ` until ${day(pausedUntil)}` : ''}. Guests can&apos;t book new dates;
            existing bookings stay.
          </p>
          <PauseButton listing={listing} />
        </div>
      ) : null}
      <nav aria-label="Property sections" className="mt-5 overflow-x-auto [scrollbar-width:thin]">
        <ul className="flex min-w-max gap-1">
          {tabs.map(([key, label, href]) => (
            <li key={key}>
              <Link
                href={`${href(listing.id)}${keep}`}
                aria-current={key === active ? 'page' : undefined}
                className={`relative inline-flex min-h-11 items-center px-3 text-meta font-semibold ${
                  key === active ? 'text-brand-800' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {label}
                {key === active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-700"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
