/* eslint-disable @next/next/no-img-element -- owner thumbnails come from Cloudinary or seed hosts. */
import { isLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { publicPhotoUrl } from '@/lib/domain/listing-content';
import PortalState from '@/components/portal/PortalState';
import PortfolioCalendar from '@/components/partner/PortfolioCalendar';
import ListingStatusBadge from '@/components/partner/ListingStatusBadge';
import PortalPage from '@/components/portal/PortalPage';
import Pagination from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
import { ArrowLeft, Building2, ExternalLink, Search, Settings2 } from 'lucide-react';
import { z } from 'zod';

export const metadata = { title: 'Property calendars' };

const STATUSES = [
  ['all', 'All'],
  ['live', 'Live'],
  ['draft', 'Draft'],
  ['pending_review', 'In review'],
  ['paused', 'Paused'],
  ['rejected', 'Not approved'],
];

export default async function CalendarPage({ searchParams }) {
  await requireActiveClient();
  const query = await searchParams;
  const q = typeof query.q === 'string' ? query.q.slice(0, 100) : '';
  const page = /^\d{1,6}$/.test(query.listPage || '') ? Math.max(1, Number(query.listPage)) : 1;
  const pageSize = [10, 20, 50].includes(Number(query.listSize)) ? Number(query.listSize) : 10;
  const status = STATUSES.some(([value]) => value === query.status) ? query.status : 'all';
  const anchor = isLocalDate(query.from) ? query.from : propertyToday();
  const view = ['agenda', 'month', 'multi', 'week'].includes(query.view) ? query.view : 'month';
  const chosen = z.string().uuid().safeParse(query.property);
  const listFilters = {
    ...(q ? { q } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(page > 1 ? { listPage: String(page) } : {}),
    ...(pageSize !== 10 ? { listSize: String(pageSize) } : {}),
  };
  const href = (changes) =>
    `/partner/calendar?${new URLSearchParams({ ...listFilters, ...changes })}`;

  const list = await settle(partnerApi.listings({ query: q, status, page, pageSize }));
  if (list.failure) return <PortalState kind={list.failure} />;
  const items = list.data.items;
  // Desktop opens the first property straight away; phones show the list until one is chosen.
  const propertyId = chosen.success ? chosen.data : items[0]?.id;
  const calendar = propertyId
    ? await settle(
        partnerApi.portfolioCalendar({
          property: propertyId,
          from: view === 'month' ? monthStart(anchor) : anchor,
          days: view === 'month' ? 42 : view === 'multi' ? 30 : 7,
          slot: query.slot,
        }),
      )
    : null;
  const selected =
    items.find((item) => item.id === propertyId) ?? calendar?.data?.items?.[0] ?? null;
  const cover = selected?.cover
    ? publicPhotoUrl(selected.cover)
    : (calendar?.data?.items?.[0]?.photo?.url ?? null);

  return (
    <PortalPage className="space-y-6">
      <header className={chosen.success ? 'max-lg:hidden' : ''}>
        <h1 className="text-h1 leading-tight font-bold tracking-[-0.03em] text-ink-900">
          Calendar
        </h1>
        <p className="mt-2 max-w-2xl text-meta text-ink-600">
          Availability, bookings, blocks and date prices for each property. All times are in IST.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Property rail */}
        <section
          aria-labelledby="calendar-properties"
          className={`min-w-0 rounded-lg border border-border bg-card lg:sticky lg:top-20 ${chosen.success ? 'max-lg:hidden' : ''}`}
        >
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="calendar-properties" className="text-h4 font-semibold text-ink-900">
                Properties
              </h2>
              <span className="text-meta text-ink-500 tabular">{list.data.total}</span>
            </div>
            <Form action="/partner/calendar" role="search" className="relative">
              {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
              {pageSize !== 10 ? <input type="hidden" name="listSize" value={pageSize} /> : null}
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                maxLength={100}
                defaultValue={q}
                aria-label="Search properties"
                placeholder="Search properties"
                className="min-h-11 w-full rounded-md border border-input bg-ink-25 py-2 pr-3 pl-9 text-base hover:border-primary focus:bg-card md:text-sm"
              />
            </Form>
            <ul aria-label="Filter by status" className="flex flex-wrap gap-1.5">
              {STATUSES.map(([value, text]) => (
                <li key={value} className="shrink-0">
                  <Link
                    scroll={false}
                    aria-current={status === value ? 'true' : undefined}
                    href={`/partner/calendar?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(value !== 'all' ? { status: value } : {}),
                      ...(pageSize !== 10 ? { listSize: String(pageSize) } : {}),
                    })}`}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3 text-tiny font-semibold transition-colors ${status === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-border text-ink-700 hover:border-brand-300 hover:bg-brand-50'}`}
                  >
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {items.length ? (
            <ul className="max-h-[calc(100dvh-22rem)] divide-y divide-border overflow-y-auto lg:min-h-40">
              {items.map((item) => {
                const active = item.id === propertyId;
                // Phones show the list until an owner picks; only desktop pre-selects.
                const tone = active ? (chosen.success ? 'bg-brand-50' : 'lg:bg-brand-50') : '';
                const thumb = item.cover ? publicPhotoUrl(item.cover) : null;
                return (
                  <li key={item.id}>
                    <Link
                      scroll={false}
                      href={href({ property: item.id, view, from: anchor })}
                      aria-current={active && chosen.success ? 'page' : undefined}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50 ${tone}`}
                    >
                      {thumb ? (
                        <img
                          src={thumb.replace(
                            '/image/upload/',
                            '/image/upload/c_fill,w_112,h_112,f_auto,q_auto/',
                          )}
                          alt=""
                          className="size-12 shrink-0 rounded-md bg-ink-100 object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid size-12 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"
                        >
                          <Building2 className="size-5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-meta font-semibold text-ink-900 ${active ? (chosen.success ? 'text-brand-800' : 'lg:text-brand-800') : ''}`}
                        >
                          {item.title || 'Untitled draft'}
                        </span>
                        <span className="mt-0.5 block truncate text-tiny text-ink-500">
                          {[item.areaName, item.cityName].filter(Boolean).join(', ') ||
                            'Location not set'}
                          {item.rentalUnit === 'hour' ? ' · Hourly' : ''}
                        </span>
                        <span className="mt-1.5 block">
                          <ListingStatusBadge status={item.status} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-meta text-ink-600">
              No properties match these filters.{' '}
              <Link href="/partner/calendar" className="font-semibold text-brand-700 underline">
                Clear filters
              </Link>
            </p>
          )}
          <Pagination
            compact
            page={list.data.page}
            pageSize={pageSize}
            total={list.data.total}
            pageParam="listPage"
            sizeParam="listSize"
            label="Property pages"
            className="border-t border-border px-4 py-3"
          />
        </section>

        {/* Calendar workspace */}
        <section
          aria-label="Property calendar"
          className={`min-w-0 ${chosen.success ? '' : 'max-lg:hidden'}`}
        >
          {!propertyId ? (
            <div className="rounded-lg border border-border bg-card p-6">
              <EmptyState
                title="No property to show"
                description="Add a property, or clear the filters, to manage its calendar."
                actionHref="/partner/listings/new"
                actionLabel="Add property"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Link
                href={href({})}
                scroll={false}
                className="inline-flex min-h-11 items-center gap-1.5 text-meta font-semibold text-brand-700 lg:hidden"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                All properties
              </Link>
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
                {cover ? (
                  <img
                    src={cover.replace(
                      '/image/upload/',
                      '/image/upload/c_fill,w_160,h_160,f_auto,q_auto/',
                    )}
                    alt=""
                    className="size-14 shrink-0 rounded-md bg-ink-100 object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-14 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"
                  >
                    <Building2 className="size-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-h3 font-semibold text-ink-900">
                    {selected?.title || calendar?.data?.items?.[0]?.title || 'Untitled draft'}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-600">
                    {selected?.status ? <ListingStatusBadge status={selected.status} /> : null}
                    {selected ? (
                      <span>
                        {[selected.areaName, selected.cityName].filter(Boolean).join(', ') ||
                          'Location not set'}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/partner/listings/${propertyId}/booking-rules`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-meta font-semibold text-ink-800 hover:bg-ink-50"
                  >
                    <Settings2 className="size-4" aria-hidden="true" />
                    Booking rules
                  </Link>
                  <Link
                    href={`/partner/listings/${propertyId}/overview`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-meta font-semibold text-ink-800 hover:bg-ink-50"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Property
                  </Link>
                </div>
              </div>
              {calendar?.failure ? (
                <PortalState kind={calendar.failure} />
              ) : !calendar?.data?.items?.length ? (
                <div className="rounded-lg border border-border bg-card p-6">
                  <EmptyState
                    variant="compact"
                    title="No calendar yet"
                    description="Finish setting up this property's visit hours to manage its dates."
                    actionHref={`/partner/listings/${propertyId}/booking-rules`}
                    actionLabel="Open booking rules"
                  />
                </div>
              ) : (
                <PortfolioCalendar
                  data={{ ...calendar.data, property: propertyId }}
                  view={view}
                  anchor={anchor}
                  listFilters={listFilters}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </PortalPage>
  );
}

function monthStart(value) {
  const date = new Date(value + 'T00:00:00Z');
  date.setUTCDate(1);
  date.setUTCDate(1 - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
