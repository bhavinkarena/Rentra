import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { staffApi } from '@/lib/api/endpoints';
import { staffSession } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import { VisitLifecycle } from '@/components/customer/VisitLifecycle';
import { recordStaffVisit } from '@/lib/actions/staff';

export const metadata = { title: 'Visit' };

const ist = (value, timeZone) =>
  new Date(value).toLocaleString('en-IN', { timeZone, dateStyle: 'medium', timeStyle: 'short' });

/** One assigned booking's visits: where to go, whom to call, and the evidence to record. */
export default async function StaffVisitPage({ params }) {
  const { failure: sessionFailure } = await staffSession();
  if (sessionFailure)
    return <PortalState kind={sessionFailure} backHref="/staff" backLabel="Visits" />;
  const { orderId } = await params;
  const { data, failure } = await settle(staffApi.visit(orderId));
  if (failure) return <PortalState kind={failure} backHref="/staff" backLabel="Visits" />;
  return (
    <div className="space-y-5">
      <Link href="/staff" className="text-tiny font-semibold text-brand-700 underline">
        ← Visits
      </Link>
      <header>
        <h1 className="text-h2 font-bold text-ink-900">{data.propertyTitle}</h1>
        <p className="text-tiny text-ink-500">Booking {data.reference}</p>
      </header>
      {data.arrival ? (
        <section
          aria-label="Arrival"
          className="rounded-lg border border-border bg-card p-4 text-meta"
        >
          <p className="font-semibold text-ink-900">{data.arrival.address ?? 'Address not set'}</p>
          <p className="mt-1 text-ink-700">
            Owner: {data.arrival.ownerName ?? '—'}
            {data.arrival.ownerPhone ? ` · ${data.arrival.ownerPhone}` : ''}
          </p>
        </section>
      ) : null}
      {data.houseRules.length ? (
        <section
          aria-label="House rules"
          className="rounded-lg border border-border bg-card p-4 text-meta"
        >
          <h2 className="font-semibold text-ink-900">House rules the guest accepted</h2>
          <ul className="mt-2 list-disc pl-5">
            {data.houseRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.visits.map((visit) => (
        <section
          key={visit.id}
          aria-label={`Visit ${visit.reference}`}
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-h4 font-bold text-ink-900">
              {visit.startsAt ? `${ist(visit.startsAt, data.timeZone)} IST` : visit.date}
            </h2>
            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-tiny font-semibold text-ink-800">
              {visit.state.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="text-tiny text-ink-600">
            {visit.reference} ·{' '}
            {visit.slot === 'hourly' ? visit.label : visit.slot.replaceAll('_', ' ')} ·{' '}
            {visit.guests} {visit.slot === 'hourly' ? 'player(s)' : 'guest(s)'}
            {visit.endsAt ? ` · ends ${ist(visit.endsAt, data.timeZone)} IST` : ''}
          </p>
          <VisitEvidence
            visit={visit}
            orderId={data.orderId}
            base="/staff/visits"
            timeZone={data.timeZone}
            canReport={false}
            action={
              data.canRecord ? (
                <VisitLifecycle
                  key={`${visit.id}-${visit.version}`}
                  visit={visit}
                  requestKey={randomUUID()}
                  action={recordStaffVisit}
                />
              ) : null
            }
          />
        </section>
      ))}
    </div>
  );
}
