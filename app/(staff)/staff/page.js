import Link from '@/components/navigation/NavigationLink';
import { staffApi } from '@/lib/api/endpoints';
import { staffSession } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { StaffSignOut } from '@/components/staff/StaffForms';

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
  const { data, failure } = await settle(staffApi.visits({ tab: query.tab }));

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
          {data.items.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {data.items.map((visit) => (
                <li key={visit.id}>
                  <Link
                    href={`/staff/visits/${visit.orderId}`}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-ink-50"
                  >
                    <span>
                      <span className="block text-meta font-semibold text-ink-900">
                        {visit.propertyTitle}
                      </span>
                      <span className="block text-tiny text-ink-600">
                        {visit.startsAt ? `${ist(visit.startsAt)} IST` : visit.date} ·{' '}
                        {visit.slot.replaceAll('_', ' ')} · {visit.guests} guest(s) ·{' '}
                        {visit.reference}
                      </span>
                    </span>
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-tiny font-semibold text-ink-800">
                      {visit.state.replaceAll('_', ' ')}
                    </span>
                  </Link>
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
