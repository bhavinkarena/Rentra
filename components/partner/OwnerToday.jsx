import Link from '@/components/navigation/NavigationLink';
import { PropertyPhoto, displayMoney } from '@/components/customer/BookingDisplay';
import ListingStatusBadge from './ListingStatusBadge';
import RetryButton from '@/components/portal/RetryButton';
import { visibleTasks } from '@/lib/domain/client-updates';

const local = (value, options) =>
  new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...options });
const time = (value) =>
  value ? local(value, { hour: 'numeric', minute: '2-digit' }) : 'Hours with Rentra';
const link =
  'inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4';

function Section({ title, result, children, action }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3">{title}</h2>
        {action}
      </div>
      {result?.failure ? (
        <div className="mt-3">
          <p role="alert" className="text-meta text-danger">
            {title} could not load.
          </p>
          <RetryButton label={`Retry ${title}`} />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function VisitRows({ title, rows = [], count = 0, departure = false }) {
  if (!count) return null;
  return (
    <div className="mt-5">
      <h3 className="text-meta font-semibold">
        {title} · {count}
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {rows.map((row) => {
          const href = `/partner/bookings/${row.id}#visit-${row.visitId}`;
          const phone = String(row.contact?.phone ?? '').replace(/\D/g, '');
          const action =
            {
              handover: 'Record check-in',
              return: 'Record check-out',
              complete: 'Finish inspection',
            }[row.operation?.action] ?? 'View visit';
          return (
            <li key={row.visitId} className="py-4">
              <p className="font-semibold tabular">
                {time(departure ? row.endsAt : row.startsAt)} · {row.firstVisitLabel}
              </p>
              <p className="mt-1 text-meta">
                {row.contact?.name || 'Guest'} · {row.guests} guests · {row.title}
              </p>
              <p className="mt-1 text-tiny text-ink-500">{row.operation?.label}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-meta font-semibold text-white"
                >
                  {action}
                </Link>
                {phone && /^\d{10,15}$/.test(phone) ? (
                  <>
                    <a className={link} href={`tel:+${phone.length === 10 ? '91' : ''}${phone}`}>
                      Call guest
                    </a>
                    <a
                      className={link}
                      href={`https://wa.me/${phone.length === 10 ? '91' : ''}${phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {count > rows.length ? (
        <Link href="/partner/bookings?tab=today" className={link}>
          +{count - rows.length} more today
        </Link>
      ) : null}
    </div>
  );
}

export default function OwnerToday({ needs, visits, week, earnings, properties }) {
  const tasks = visibleTasks(needs?.data?.tasks),
    actions = tasks.filter((t) => t.kind === 'action'),
    info = tasks.filter((t) => t.kind === 'info');
  const today = visits?.data;
  return (
    <div className="mt-6 space-y-5">
      <Section title="Needs you" result={needs}>
        {actions.length ? (
          <ul className="mt-2 divide-y divide-border">
            {actions.map((task) => (
              <li key={task.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="min-w-0 flex-1 text-meta">{task.label}</p>
                <Link href={task.href} className={link}>
                  {task.action ?? 'Open'}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-meta text-ink-600">Nothing needs your action right now.</p>
        )}
        {info.length ? (
          <details className="mt-3 border-t border-border pt-3">
            <summary className="cursor-pointer text-meta font-semibold">
              With Rentra and other updates
            </summary>
            <ul className="mt-2">
              {info.map((task) => (
                <li key={task.key}>
                  <Link href={task.href} className={`${link} text-meta`}>
                    {task.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section
          title="Today’s visits"
          result={visits}
          action={
            <Link href="/partner/bookings?tab=today" className={link}>
              {today?.total ? `${today.total} visits today` : 'Bookings'}
            </Link>
          }
        >
          <VisitRows title="Arriving" rows={today?.arrivals} count={today?.arrivalCount} />
          <VisitRows
            title="Leaving"
            rows={today?.departures}
            count={today?.departureCount}
            departure
          />
          <VisitRows title="On site" rows={today?.onSite} count={today?.onSiteCount} />
          {today?.offline?.length > 0 && (
            <div className="mt-5">
              <h3 className="font-semibold">Offline bookings · {today.offline.length}</h3>
              <ul className="divide-y">
                {today.offline.map((r) => (
                  <li key={r.id} className="py-3 space-y-2">
                    <p>
                      {r.name} · {r.guests} guests · {r.title}
                    </p>
                    <p>
                      {time(r.startsAt)}–{time(r.endsAt)}
                    </p>
                    {r.phone && (
                      <a className={link} href={`tel:${r.phone}`}>
                        Call guest
                      </a>
                    )}
                    <Link className={link} href={`/partner/listings/${r.propertyId}/calendar`}>
                      Open calendar
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!today?.arrivalCount && !today?.departureCount && !today?.onSiteCount ? (
            <div className="mt-4 space-y-2 text-meta text-ink-600">
              <p>
                {today?.total
                  ? 'Visit hours need Rentra’s attention. See Bookings for details.'
                  : 'No guests today.'}
              </p>
              {today?.next ? (
                <Link href={today.next.href} className={link}>
                  Next booking:{' '}
                  {local(today.next.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })}
                  , {today.next.label} at {today.next.title}
                </Link>
              ) : (
                <>
                  <p>No upcoming bookings yet.</p>
                  <Link href="/partner/calendar" className={link}>
                    Open calendar
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </Section>
        <Section
          title="This week"
          result={week}
          action={
            <Link href="/partner/calendar" className={link}>
              Calendar
            </Link>
          }
        >
          <ul className="mt-3 divide-y divide-border">
            {week?.data?.map((day) => (
              <li key={day.date}>
                <Link
                  href={`/partner/calendar?from=${day.date}`}
                  className="flex min-h-14 items-center justify-between gap-3 py-3 text-meta"
                >
                  <span className="shrink-0 font-semibold">
                    {local(`${day.date}T12:00:00+05:30`, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="min-w-0 text-right text-ink-600">
                    {day.count
                      ? `${day.count} visits · ${day.properties.slice(0, 2).join(', ')}`
                      : 'No visits'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <Section
        title="Earnings"
        result={earnings}
        action={
          <Link href="/partner/earnings" className={link}>
            View earnings
          </Link>
        }
      >
        {earnings?.data ? (
          <>
            <p className="mt-3 text-h3">
              Booked this month: {displayMoney(earnings.data.bookedRentMinor)}
            </p>
            <p className="mt-2 text-meta text-ink-600">{earnings.data.status}</p>
            <details className="mt-2 text-tiny text-ink-500">
              <summary className="min-h-11 cursor-pointer py-3">
                How this amount is calculated
              </summary>
              <p>
                {earnings.data.basis} Rent only; guest fees and deposits are excluded.{' '}
                {earnings.data.environment === 'live'
                  ? 'Live payments.'
                  : 'Test or simulated payments; this is not money paid to you.'}
              </p>
            </details>
          </>
        ) : null}
      </Section>
      <Section
        title="Properties"
        result={properties}
        action={
          <Link href="/partner/listings" className={link}>
            All properties
          </Link>
        }
      >
        {properties?.data?.length ? (
          <ul className="mt-4 flex gap-4 overflow-x-auto pb-2" aria-label="Your properties">
            {properties.data.map((property) => (
              <li
                key={property.id}
                className="w-64 shrink-0 overflow-hidden rounded-md border border-border"
              >
                <Link href={`/partner/listings/${property.id}/overview`} className="block h-full">
                  <div className="h-32 overflow-hidden">
                    <PropertyPhoto photo={property.photo} title={property.title} />
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="font-semibold">{property.title || 'Untitled property'}</h3>
                    <ListingStatusBadge status={property.status} />
                    <p className="text-meta text-ink-600">
                      {property.next
                        ? `Next booking: ${property.next.startsAt ? local(property.next.startsAt, { day: 'numeric', month: 'short' }) : 'Hours with Rentra'} · ${property.next.label}`
                        : 'No upcoming bookings'}
                    </p>
                    {property.strength != null ? (
                      <p className="text-tiny text-ink-500">Setup strength: {property.strength}%</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-meta text-ink-600">
            Add your first property to start getting ready for bookings.
          </p>
        )}
      </Section>
    </div>
  );
}
