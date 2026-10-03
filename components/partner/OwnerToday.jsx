/* eslint-disable @next/next/no-img-element -- owner thumbnails come from Cloudinary or seed hosts. */
import Link from '@/components/navigation/NavigationLink';
import {
  ArrowRight,
  Bell,
  Building2,
  CircleCheck,
  ClipboardList,
  Info,
  LifeBuoy,
  Phone,
  Scale,
  Star,
} from 'lucide-react';
import OwnerAnalytics from './OwnerAnalytics';
import ListingStatusBadge from './ListingStatusBadge';
import { propertyTitle } from './property/PropertyHub';
import { displayMoney, StateBadge, totalPrice } from '@/components/customer/BookingDisplay';
import { visibleTasks, updateTitle, updateHref } from '@/lib/domain/client-updates';
import { statusMeta } from '@/lib/domain/status';
import InlineAlert from '@/components/portal/InlineAlert';
import RetryButton from '@/components/portal/RetryButton';

const IST = 'Asia/Kolkata';
const time = (value) =>
  new Date(value).toLocaleTimeString('en-IN', {
    timeZone: IST,
    hour: 'numeric',
    minute: '2-digit',
  });
const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
const istDate = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: IST });
// Week rows are IST calendar dates; read them at IST noon so no zone can shift the day.
const calendarDay = (iso, options) =>
  new Date(`${iso}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: IST, ...options });

const categories = {
  booking: ['Bookings', ClipboardList],
  property: ['Properties & calendar', Building2],
  review: ['Reviews', Star],
  support: ['Support', LifeBuoy],
  dispute: ['Disputes', Scale],
  account: ['Account & inbox', Bell],
};
function taskCategory(task) {
  if (/review/.test(task.key)) return 'review';
  if (/dispute|incident/.test(task.key)) return 'dispute';
  if (/support/.test(task.key)) return 'support';
  if (/booking|visit/.test(task.key)) return 'booking';
  if (/^(propert|draft|dates|auto_open)/.test(task.key)) return 'property';
  return 'account';
}

const bigFigure = 'text-stat font-semibold tracking-[-0.03em] text-ink-900';

function Tile({ title, id, action, className = '', children }) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      <header className="mb-4 flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="text-h4 font-semibold text-ink-900">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Failed({ what }) {
  return <InlineAlert action={<RetryButton />}>{what} could not load. Try again.</InlineAlert>;
}

function ViewAll({ href, children = 'View all', label }) {
  return (
    <Link
      href={href}
      className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-meta font-semibold text-brand-700 hover:bg-brand-50 hover:text-brand-800"
    >
      {children}
      {label ? <span className="sr-only"> {label}</span> : null}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

/* ----------------------------------------------------------------- Today */

const EVENTS = {
  arriving: { label: 'Arriving', dot: 'bg-champagne' },
  leaving: { label: 'Leaving', dot: 'bg-brand-300' },
  on_site: { label: 'On site', dot: 'bg-paper' },
};

function TodayTile({ visits }) {
  const data = visits?.data;
  // A visit can be on site and leaving today; arriving beats leaving beats on site.
  const seen = new Set();
  const rows = [
    ...(data?.arrivals || []).map((row) => ({ ...row, event: 'arriving' })),
    ...(data?.departures || []).map((row) => ({ ...row, event: 'leaving' })),
    ...(data?.onSite || []).map((row) => ({ ...row, event: 'on_site' })),
  ]
    .filter((row) => !seen.has(row.visitId) && seen.add(row.visitId))
    .sort((a, b) => String(a.startsAt ?? '~').localeCompare(String(b.startsAt ?? '~')));
  const counts = [
    ['Arriving', data?.arrivalCount ?? 0],
    ['On site', data?.onSiteCount ?? 0],
    ['Leaving', data?.departureCount ?? 0],
  ];
  const offline = data?.offline || [];
  const busy = rows.length > 0 || offline.length > 0;
  const action =
    'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-meta font-semibold';
  return (
    <section
      aria-labelledby="today-title"
      data-surface="inverse"
      className="flex min-w-0 flex-col rounded-lg bg-brand-900 p-5 text-paper sm:p-6 lg:col-span-7"
    >
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="today-title" className="text-h3 font-semibold text-paper">
            Today
          </h2>
          {data?.date ? (
            <p className="text-meta text-on-dark-muted">
              {calendarDay(data.date, { weekday: 'long', day: 'numeric', month: 'long' })} · IST
            </p>
          ) : null}
        </div>
        <Link
          href="/partner/bookings?tab=today"
          className="-mr-3 inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-meta font-semibold text-champagne hover:bg-white/10"
        >
          All of today
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>
      {visits?.failure ? (
        <div className="mt-4 text-ink-900" data-surface="light">
          <Failed what="Today's visits" />
        </div>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-3 divide-x divide-forest-line rounded-md border border-forest-line">
            {counts.map(([label, value]) => (
              <div key={label} className="px-4 py-3 sm:px-5">
                <dt className="text-meta text-on-dark-muted">{label}</dt>
                <dd className="mt-1.5 text-stat font-semibold tracking-[-0.03em] text-paper">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {busy ? (
            <ul className="mt-3 divide-y divide-forest-line" aria-label="Guests today">
              {rows.slice(0, 5).map((row) => (
                <li
                  key={row.visitId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto]"
                >
                  <span className="hidden text-meta font-semibold text-paper tabular sm:block">
                    {row.startsAt ? time(row.startsAt) : '—'}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-paper">
                        {row.contact?.name || 'Guest'}
                      </span>
                      <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-tiny font-semibold text-paper sm:inline-flex">
                        <span
                          className={`size-1.5 rounded-full ${EVENTS[row.event].dot}`}
                          aria-hidden="true"
                        />
                        {EVENTS[row.event].label}
                      </span>
                    </span>
                    <span className="block text-meta font-semibold text-paper sm:hidden">
                      {row.startsAt ? `${time(row.startsAt)} · ` : ''}
                      {EVENTS[row.event].label}
                    </span>
                    <span className="block truncate text-meta text-on-dark-muted">
                      {row.title} · {row.guests ?? 0} guests
                    </span>
                  </span>
                  <Link
                    href={`/partner/bookings?tab=today&booking=${row.id}`}
                    className={`${action} bg-champagne text-champagne-foreground hover:bg-champagne-hover active:bg-champagne-active`}
                  >
                    {row.operation?.label || 'View'}
                    <span className="sr-only">: {row.contact?.name || 'guest'}</span>
                  </Link>
                </li>
              ))}
              {offline.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto]"
                >
                  <span className="hidden text-meta font-semibold text-paper tabular sm:block">
                    {time(row.startsAt)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-paper">{row.name}</span>
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-tiny font-semibold text-paper">
                        Offline
                      </span>
                    </span>
                    <span className="block text-meta font-semibold text-paper sm:hidden">
                      {time(row.startsAt)}
                    </span>
                    <span className="block truncate text-meta text-on-dark-muted">
                      {row.title ? `${row.title} · ` : ''}until {time(row.endsAt)} · {row.guests}{' '}
                      guests
                    </span>
                  </span>
                  {row.phone ? (
                    <a
                      href={`tel:${row.phone}`}
                      className={`${action} border border-forest-line text-paper hover:bg-white/10`}
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      Call
                      <span className="sr-only"> {row.name}</span>
                    </a>
                  ) : (
                    <Link
                      href={`/partner/calendar?property=${row.propertyId}`}
                      className={`${action} border border-forest-line text-paper hover:bg-white/10`}
                    >
                      Calendar
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 flex flex-1 flex-col justify-center rounded-md border border-dashed border-forest-line px-5 py-6">
              <p className="font-semibold text-paper">
                {data?.total ? 'Visit hours need attention' : 'No guests today'}
              </p>
              <p className="mt-1 text-meta text-on-dark-muted">
                {data?.total
                  ? 'Open today’s bookings to check the details.'
                  : data?.next
                    ? `Next booking: ${shortDate(data.next.startsAt)}, ${time(data.next.startsAt)} at ${data.next.title}.`
                    : 'Bookings show up here on the day of the visit.'}
              </p>
            </div>
          )}
          {rows.length > 5 ? (
            <p className="mt-2 text-meta text-on-dark-muted">
              +{rows.length - 5} more today.{' '}
              <Link
                href="/partner/bookings?tab=today"
                className="font-semibold text-champagne underline"
              >
                See all
              </Link>
            </p>
          ) : null}
          {busy && data?.next ? (
            <p className="mt-auto border-t border-forest-line pt-4 text-meta text-on-dark-muted">
              Next booking{' '}
              <span className="font-semibold text-paper">
                {shortDate(data.next.startsAt)}, {time(data.next.startsAt)}
              </span>{' '}
              · {data.next.title}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- Needs you */

function NeedsYouTile({ needs, visits }) {
  // The Today tile already carries a button for each guest row; don't ask twice.
  const today = [
    ...(visits?.data?.arrivals || []),
    ...(visits?.data?.departures || []),
    ...(visits?.data?.onSite || []),
  ].map((row) => `booking=${row.id}`);
  const tasks = visibleTasks(needs?.data?.tasks).filter(
    (task) => !today.some((ref) => task.href?.includes(ref)),
  );
  const actions = tasks.filter((task) => task.kind === 'action').length;
  return (
    <Tile
      id="needs-title"
      className="lg:col-span-5"
      title={
        <span className="flex items-center gap-2">
          Needs you
          {actions ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-warning-bg px-2 text-tiny font-semibold text-warning ring-1 ring-warning/15 ring-inset">
              {actions}
            </span>
          ) : null}
        </span>
      }
      action={
        <ViewAll href="/partner/updates" label="actions">
          Inbox
        </ViewAll>
      }
    >
      {needs?.failure ? (
        <Failed what="Your actions" />
      ) : tasks.length ? (
        <>
          <ul className="-my-3 divide-y divide-border" aria-label="Actions">
            {tasks.slice(0, 5).map((task) => {
              const [category, Icon] = categories[taskCategory(task)];
              const urgent = task.kind === 'action';
              return (
                <li
                  key={task.key}
                  className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-md ${urgent ? 'bg-warning-bg text-warning' : 'bg-ink-100 text-ink-600'}`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-meta leading-5 text-ink-900">{task.label}</span>
                    <span className="block text-tiny text-ink-500">
                      {category}
                      {urgent ? '' : ' · For your information'}
                    </span>
                  </span>
                  <Link
                    href={task.href}
                    className={`col-start-2 inline-flex min-h-11 items-center justify-self-start rounded-md px-3 text-meta font-semibold sm:col-start-3 ${urgent ? 'bg-primary text-white hover:bg-primary-hover active:bg-brand-900' : 'border border-border text-brand-700 hover:bg-ink-50'}`}
                  >
                    {task.action || 'Open'}
                  </Link>
                </li>
              );
            })}
          </ul>
          {tasks.length > 5 ? (
            <p className="mt-5 text-meta text-ink-600">
              {tasks.length - 5} more in your{' '}
              <Link href="/partner/updates" className="font-semibold text-brand-700 underline">
                inbox
              </Link>
              .
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <CircleCheck className="size-6" aria-hidden="true" />
          </span>
          <p className="font-semibold text-ink-900">You’re all caught up</p>
          <p className="max-w-xs text-meta text-ink-600">
            Check-ins, guest reviews and requests from Rentra show up here.
          </p>
        </div>
      )}
    </Tile>
  );
}

/* ------------------------------------------------------------- This week */

function WeekTile({ week }) {
  const days = week?.data || [];
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const busiest = days.reduce((top, day) => (day.count > (top?.count ?? 0) ? day : top), null);
  return (
    <Tile
      id="week-title"
      title="Next 7 days"
      className="lg:col-span-4"
      action={
        <ViewAll href="/partner/calendar" label="view">
          Calendar
        </ViewAll>
      }
    >
      {week?.failure ? (
        <Failed what="This week" />
      ) : (
        <>
          <p className="text-meta text-ink-600">
            <strong className={bigFigure}>{total}</strong> {total === 1 ? 'visit' : 'visits'}
            {busiest ? ` · busiest on ${calendarDay(busiest.date, { weekday: 'long' })}` : null}
          </p>
          <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Visits per day">
            {days.map((day, index) => (
              <li key={day.date} className="min-w-0">
                <Link
                  href={`/partner/bookings?${new URLSearchParams({ from: day.date, to: day.date, tab: 'all' })}`}
                  title={day.properties.join(', ') || 'No visits'}
                  className="group flex flex-col items-center rounded-md px-0.5 pt-1 pb-2 hover:bg-ink-50"
                >
                  <span className="sr-only">
                    {calendarDay(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}:{' '}
                    {day.count} {day.count === 1 ? 'visit' : 'visits'}
                  </span>
                  <span aria-hidden="true" className="relative mt-5 h-32 w-full">
                    <span
                      className="absolute inset-x-0 text-center text-tiny font-semibold text-ink-700 tabular"
                      style={{
                        bottom: `calc(${day.count ? Math.max(8, (day.count / max) * 100) : 0}% + 4px)`,
                      }}
                    >
                      {day.count || ''}
                    </span>
                    <span
                      className={`absolute bottom-0 left-1/2 w-full max-w-6 -translate-x-1/2 rounded-t-[4px] ${day.count ? (index === 0 ? 'bg-brand-600' : 'bg-brand-300 group-hover:bg-brand-400') : 'bg-ink-200'}`}
                      style={{
                        height: day.count ? `${Math.max(8, (day.count / max) * 100)}%` : '2px',
                      }}
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-2 text-tiny ${index === 0 ? 'font-semibold text-ink-900' : 'text-ink-500'}`}
                  >
                    {index === 0 ? 'Today' : calendarDay(day.date, { weekday: 'short' })}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {total ? (
            <ul className="mt-4 divide-y divide-border border-t border-border text-meta">
              {[...days]
                .filter((day) => day.count)
                .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date))
                .slice(0, 3)
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((day) => (
                  <li key={day.date} className="flex items-baseline gap-3 py-2.5">
                    <span className="w-24 shrink-0 font-semibold text-ink-900">
                      {calendarDay(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="flex min-w-0 flex-1 gap-1 text-ink-600">
                      <span className="truncate">{day.properties[0] ?? 'Visits'}</span>
                      {day.properties.length > 1 ? (
                        <span className="shrink-0 text-ink-500">+{day.properties.length - 1}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-semibold text-ink-900 tabular">
                      {day.count}
                      <span className="sr-only"> visits</span>
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-4 border-t border-border pt-4 text-meta text-ink-600">
              No visits booked for the next 7 days yet.
            </p>
          )}
        </>
      )}
    </Tile>
  );
}

/* ------------------------------------------------------ Recent bookings */

const initials = (name) =>
  String(name || 'Guest')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

function BookingsTile({ records, todayDate }) {
  const items = (records?.data?.items || []).filter(
    (item) => !todayDate || !item.firstVisit || istDate(item.firstVisit) !== todayDate,
  );
  return (
    <Tile
      id="bookings-title"
      title="Upcoming & recent bookings"
      className="lg:col-span-8 lg:self-start"
      action={<ViewAll href="/partner/bookings" label="bookings" />}
    >
      {records?.failure ? (
        <Failed what="Bookings" />
      ) : items.length ? (
        <ul className="-mx-2 -my-3 divide-y divide-border" aria-label="Recent bookings">
          {items.slice(0, 5).map((item) => (
            <li key={item.visitId ?? item.id}>
              <Link
                href={`/partner/bookings?tab=all&booking=${item.id}`}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-3 hover:bg-ink-50 sm:grid-cols-[2.5rem_minmax(0,1.5fr)_minmax(0,1fr)_7.5rem_6.5rem] sm:gap-4"
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-full bg-brand-50 text-meta font-semibold text-brand-700"
                >
                  {initials(item.contact?.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink-900">
                    {item.contact?.name || 'Guest'}
                  </span>
                  <span className="block truncate text-meta text-ink-600">{item.title}</span>
                </span>
                <span className="hidden min-w-0 text-meta text-ink-800 sm:block">
                  {item.firstVisit ? shortDate(item.firstVisit) : 'Hours with Rentra'}
                  <span className="block text-tiny text-ink-500">
                    {item.visitCount} {item.visitCount === 1 ? 'visit' : 'visits'} ·{' '}
                    {item.guests || 0} guests
                  </span>
                </span>
                <span className="hidden sm:block">
                  <StateBadge state={item.state} />
                </span>
                <span className="text-right">
                  <span className="block font-semibold text-ink-900 tabular">
                    {displayMoney(totalPrice(item))}
                  </span>
                  <span className="block text-tiny text-ink-500 sm:hidden">
                    {item.firstVisit ? shortDate(item.firstVisit) : ''}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-meta text-ink-600">
          No other bookings yet. They appear here as soon as a guest books.
        </p>
      )}
    </Tile>
  );
}

/* ---------------------------------------------------- Booking outcomes */

function OutcomesTile({ analytics }) {
  const rows = analytics?.data?.statuses || [];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <Tile id="outcomes-title" title="Booking outcomes" className="lg:col-span-4 lg:self-start">
      {analytics?.failure ? (
        <Failed what="Booking outcomes" />
      ) : total ? (
        <>
          <p className="text-meta text-ink-600">
            <strong className={bigFigure}>{total}</strong> visits · last 90 days
          </p>
          <ul className="mt-5 space-y-4">
            {rows.map((row) => {
              const share = Math.round((row.value / total) * 100);
              const label =
                row.label === 'handed_over' ? 'Checked in' : statusMeta('booking', row.label).label;
              return (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between gap-3 text-meta">
                    <span className="text-ink-700">{label}</span>
                    <span className="text-ink-900 tabular">
                      <strong className="font-semibold">{row.value}</strong>
                      <span className="ml-2 inline-block w-10 text-right text-ink-500">
                        {share}%
                      </span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full rounded-full ${row.label === 'cancelled' ? 'bg-ink-400' : 'bg-brand-500'}`}
                      style={{ width: `${Math.max(2, share)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="py-6 text-center text-meta text-ink-600">
          Outcomes appear after your first visits.
        </p>
      )}
    </Tile>
  );
}

/* ------------------------------------------------------------ Properties */

function PropertiesTile({ properties, portfolio }) {
  const items = properties?.data || [];
  const total = portfolio?.data?.total;
  return (
    <Tile
      id="properties-title"
      title={
        <span className="flex items-baseline gap-2">
          Properties
          {total != null ? (
            <span className="text-meta font-medium text-ink-500 tabular">{total}</span>
          ) : null}
        </span>
      }
      className="lg:col-span-8"
      action={<ViewAll href="/partner/listings" label="properties" />}
    >
      {properties?.failure ? (
        <Failed what="Properties" />
      ) : items.length ? (
        <ul
          className="-mx-2 grid gap-x-4 gap-y-1 sm:grid-cols-2"
          aria-label="Recently updated properties"
        >
          {items.map((property) => {
            const title = propertyTitle(property.title);
            const photo = property.photo?.url;
            return (
              <li key={property.id}>
                <Link
                  href={`/partner/listings/${property.id}/overview`}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-ink-50"
                >
                  {photo ? (
                    <img
                      src={photo.replace(
                        '/image/upload/',
                        '/image/upload/c_fill,w_160,h_160,f_auto,q_auto/',
                      )}
                      alt=""
                      className="size-16 shrink-0 rounded-md bg-ink-100 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-16 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"
                    >
                      <Building2 className="size-6" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-900">{title}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <ListingStatusBadge status={property.status} />
                      {property.status === 'live' ? (
                        <span className="truncate text-tiny text-ink-600">
                          {property.next?.startsAt
                            ? `Next ${shortDate(property.next.startsAt)}`
                            : 'No upcoming visits'}
                        </span>
                      ) : property.strength != null && property.strength < 100 ? (
                        <span className="flex items-center gap-1.5 text-tiny text-ink-600">
                          <span
                            className="h-1.5 w-12 overflow-hidden rounded-full bg-ink-100"
                            aria-hidden="true"
                          >
                            <span
                              className="block h-full rounded-full bg-brand-500"
                              style={{ width: `${property.strength}%` }}
                            />
                          </span>
                          Setup {property.strength}%
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 py-4">
          <p className="text-meta text-ink-600">
            Add your first property to start taking bookings.
          </p>
          <Link
            href="/partner/listings/new"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-meta font-semibold text-white hover:bg-primary-hover"
          >
            Add property
          </Link>
        </div>
      )}
    </Tile>
  );
}

/* --------------------------------------------------------------- Updates */

function UpdatesTile({ updates }) {
  const data = updates?.data;
  return (
    <Tile
      id="updates-title"
      title="Latest updates"
      className="lg:col-span-4"
      action={
        <ViewAll href="/partner/updates" label="updates">
          {data?.items?.length && data.unread ? `${data.unread} unread` : 'All'}
        </ViewAll>
      }
    >
      {updates?.failure ? (
        <Failed what="Updates" />
      ) : data?.items?.length ? (
        <ul className="-mx-2 -my-3 divide-y divide-border">
          {data.items.slice(0, 4).map((update) => (
            <li key={update.id}>
              <Link
                href={updateHref(update)}
                className="flex gap-3 rounded-md px-2 py-3 hover:bg-ink-50"
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${update.read ? 'bg-ink-200' : 'bg-brand-500'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span
                    className={`block text-meta ${update.read ? 'text-ink-700' : 'font-semibold text-ink-900'}`}
                  >
                    {updateTitle(update)}
                    {update.read ? null : <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="block truncate text-tiny text-ink-500">
                    {update.propertyTitle ?? update.detail?.reference ?? 'Account'} ·{' '}
                    {new Date(update.createdAt).toLocaleString('en-IN', {
                      timeZone: IST,
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-meta text-ink-600">
          You’re all caught up. Bookings, review results and Rentra messages appear here.
        </p>
      )}
    </Tile>
  );
}

/* ------------------------------------------------------------- Dashboard */

export default function OwnerToday({
  analytics,
  needs,
  visits,
  week,
  earnings,
  properties,
  records,
  portfolio,
  updates,
}) {
  return (
    <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-12">
      <TodayTile visits={visits} />
      <NeedsYouTile needs={needs} visits={visits} />
      <section
        aria-labelledby="rent-title"
        className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6 lg:col-span-8"
      >
        <OwnerAnalytics result={analytics} earnings={earnings} />
      </section>
      <WeekTile week={week} />
      <PropertiesTile properties={properties} portfolio={portfolio} />
      <UpdatesTile updates={updates} />
      <BookingsTile records={records} todayDate={visits?.data?.date} />
      <OutcomesTile analytics={analytics} />
      <p className="flex items-start gap-2 text-tiny leading-relaxed text-ink-500 lg:col-span-12">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Booked rent is quoted rent for non-cancelled visits, by visit date, including test bookings.
        It excludes guest fees and deposits and is not money paid to you. See Earnings for payouts.
      </p>
    </div>
  );
}
