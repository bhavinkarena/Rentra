import Link from '@/components/navigation/NavigationLink';
import { staffApi } from '@/lib/api/endpoints';
import { staffSession } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { StaffSignOut } from '@/components/staff/StaffForms';
import { addLocalDays, formatLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import GuestContactLinks from '@/components/booking/GuestContactLinks';

export const metadata = { title: 'Visits' };

const TABS = [
  ['today', 'Today'],
  ['action_needed', 'Needs action'],
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
];
const ist = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/** Assigned visits only; the API re-checks assignment on every request. */
export default async function StaffHome({ searchParams }) {
  const { staff, failure: sessionFailure } = await staffSession();
  if (sessionFailure) return <PortalState kind={sessionFailure} />;
  const query = (await searchParams) ?? {};
  const { data, failure } = await settle(
    staffApi.visits({ tab: query.tab, ...(query.date ? { date: query.date } : {}) }),
  );
  const today = propertyToday();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold text-ink-900">Hello, {staff.name}</h1>
          <p className="text-meta text-ink-600">
            Caretaker for {staff.ownerName ?? 'the owner'} · {staff.properties.length}{' '}
            {staff.properties.length === 1 ? 'property' : 'properties'}
          </p>
          <p className="text-tiny text-ink-500">
            {staff.permissions.evidence
              ? 'You can record handover, return and completion.'
              : 'You can view visits. The owner has not allowed you to record evidence.'}
          </p>
        </div>
        <StaffSignOut />
      </div>

      {failure ? (
        <PortalState kind={failure} />
      ) : (
        <>
          <nav aria-label="Visit lists" className="flex flex-wrap gap-2">
            {TABS.map(([key, label]) => (
              <Link
                key={key}
                href={key === 'today' ? '/staff' : `/staff?tab=${key}`}
                aria-current={data.tab === key ? 'page' : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-tiny font-semibold ${
                  data.tab === key
                    ? 'border-brand-700 bg-primary text-white'
                    : 'border-border bg-card text-ink-700'
                }`}
              >
                {label} <span className="tabular">{data.counts[key]}</span>
              </Link>
            ))}
          </nav>
          {data.tab === 'today' && data.date ? (
            // One day at a time: a venue can have dozens of visits a day.
            <nav aria-label="Choose a day" className="flex flex-wrap items-center gap-2 text-tiny">
              <Link
                className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3 font-semibold"
                href={`/staff?date=${addLocalDays(data.date, -1)}`}
              >
                Previous day
              </Link>
              <span className="font-semibold text-ink-900">
                {data.date === today ? 'Today' : formatLocalDate(data.date)}
              </span>
              <Link
                className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3 font-semibold"
                href={`/staff?date=${addLocalDays(data.date, 1)}`}
              >
                Next day
              </Link>
            </nav>
          ) : null}
          {data.offline?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-h3">Offline bookings today</h2>
              {data.offline.map((r) => (
                <article key={r.id} className="rounded-lg border p-4">
                  <p>
                    {r.name} · {r.guests} guests · {r.title}
                  </p>
                  <p>
                    {new Date(r.startsAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    –{new Date(r.endsAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                  <GuestContactLinks phone={r.phone} name={r.name || 'guest'} />
                  {r.note && <p>{r.note}</p>}
                </article>
              ))}
            </section>
          )}
          {data.items.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {data.items.map((visit) => (
                <li key={visit.id}>
                  <Link
                    href={`/staff/visits/${visit.orderId}`}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-ink-50"
                  >
                    <span>
                      {visit.slot === 'hourly' ? (
                        // Venue visits lead with the time and court, in tabular figures.
                        <span className="block text-meta font-bold text-ink-900 tabular">
                          {visit.label}
                        </span>
                      ) : null}
                      <span
                        className={
                          visit.slot === 'hourly'
                            ? 'block text-tiny font-semibold text-ink-700'
                            : 'block text-meta font-semibold text-ink-900'
                        }
                      >
                        {visit.propertyTitle}
                      </span>
                      <span className="block text-tiny text-ink-600">
                        {visit.slot === 'hourly'
                          ? `${visit.guests} player(s)`
                          : `${visit.startsAt ? `${ist(visit.startsAt)} IST` : visit.date} · ${visit.slot.replaceAll('_', ' ')} · ${visit.guests} guest(s)`}{' '}
                        · {visit.reference}
                      </span>
                    </span>
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-tiny font-semibold text-ink-800">
                      {visit.state.replaceAll('_', ' ')}
                    </span>
                  </Link>
                  {visit.guest ? (
                    // BOOK-06: visit day only, and only while the owner allows guest contact.
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
                      <span className="text-meta">
                        Guest: <strong>{visit.guest.name || 'Guest'}</strong> · {visit.guest.guests}{' '}
                        {visit.slot === 'hourly' ? 'player(s)' : 'guest(s)'}
                      </span>
                      <GuestContactLinks
                        phone={visit.guest.phone}
                        name={visit.guest.name || 'guest'}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-border bg-card p-5 text-meta text-ink-600">
              No visits in this list.
            </p>
          )}
        </>
      )}
    </div>
  );
}
