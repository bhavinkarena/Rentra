import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { CalendarDays, CreditCard, IndianRupee, MapPin, Users } from 'lucide-react';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { VisitLifecycle } from '@/components/customer/VisitLifecycle';
import { AdminKpiCard, AdminPage, AdminPageHeader, StatusBadge } from './AdminPrimitives';

const tone = (state) =>
  ['confirmed', 'completed', 'captured', 'succeeded'].includes(state)
    ? 'success'
    : ['cancelled', 'expired', 'failed'].includes(state)
      ? 'danger'
      : 'warning';
export default function AdminBookingDetail({ record }) {
  const test = record.payments.some((payment) => payment.environment === 'test');
  const total =
    record.rentMinor == null || record.feeMinor == null ? null : record.rentMinor + record.feeMinor;
  return (
    <AdminPage width="max-w-6xl">
      <AdminPageHeader
        backHref="/admin/bookings"
        backLabel="Booking records"
        eyebrow={record.reference}
        title={record.title}
        description={`Created ${new Date(record.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`}
        action={<StatusBadge tone={tone(record.state)}>{record.state}</StatusBadge>}
      />
      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminKpiCard
          label="Total"
          value={money(total)}
          icon={IndianRupee}
          hint={`Rent ${money(record.rentMinor)} + fee ${money(record.feeMinor)}`}
        />
        <AdminKpiCard
          label="Visits"
          value={record.visits.length}
          icon={CalendarDays}
          hint={`Times shown in ${record.timeZone}`}
        />
        <AdminKpiCard
          label="Payments"
          value={record.payments.length}
          icon={CreditCard}
          hint={test ? 'Includes test gateway data' : 'Verified payment records'}
          tone={test ? 'warning' : 'neutral'}
        />
        <AdminKpiCard
          label="Guests"
          value={record.visits.reduce((sum, visit) => sum + (visit.guests || 0), 0)}
          icon={Users}
          hint="Across all scheduled visits"
        />
      </section>
      {test ? (
        <div className="mt-5 rounded-lg border border-warning/25 bg-warning-bg p-4 text-meta text-amber-900">
          <strong>Test booking:</strong> no actual bank money was collected by the test gateway.
        </div>
      ) : null}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <div className="border-b border-border p-5">
              <h2 className="text-h4 font-bold">Visit lifecycle</h2>
              <p className="mt-1 text-tiny text-ink-500">
                Operational evidence and state transitions
              </p>
            </div>
            <div className="divide-y divide-border">
              {record.visits.map((visit) => (
                <article key={visit.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-ink-900">
                        {visit.date} · {visit.slot.replaceAll('_', ' ')}
                      </h3>
                      <p className="mt-1 font-mono text-[0.68rem] text-ink-500">
                        {visit.reference}
                      </p>
                    </div>
                    <StatusBadge tone={tone(visit.state)}>{visit.state}</StatusBadge>
                  </div>
                  <div className="mt-4 grid gap-3 text-tiny text-ink-600 sm:grid-cols-3">
                    <p>
                      <strong className="block text-ink-900">Guests</strong>
                      {visit.guests}
                    </p>
                    <p>
                      <strong className="block text-ink-900">Arrival</strong>
                      {time(visit.startsAt, record.timeZone)}
                    </p>
                    <p>
                      <strong className="block text-ink-900">Departure</strong>
                      {time(visit.endsAt, record.timeZone)}
                    </p>
                  </div>
                  <div className="mt-4 rounded-md bg-ink-25 p-4">
                    <VisitLifecycle
                      key={`${visit.id}-${visit.version}`}
                      requestKey={randomUUID()}
                      visit={visit}
                      admin
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <div className="border-b border-border p-5">
              <h2 className="text-h4 font-bold">Payments</h2>
            </div>
            {record.payments.length ? (
              <div className="divide-y divide-border">
                {record.payments.map((payment) => (
                  <div key={payment.id} className="p-5">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold capitalize">
                        {payment.provider} · {payment.environment}
                      </p>
                      <StatusBadge tone={tone(payment.state)}>{payment.state}</StatusBadge>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-tiny">
                      <div>
                        <dt className="text-ink-500">Expected</dt>
                        <dd className="font-bold">{money(payment.expectedMinor)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Captured</dt>
                        <dd className="font-bold">{money(payment.capturedMinor)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Refunded</dt>
                        <dd className="font-bold">{money(payment.refundedMinor)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Actual bank collection</dt>
                        <dd className="font-bold">{money(payment.actualBankMinor)}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-5 text-meta text-ink-500">No verified payment record.</p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="text-h4 font-bold">Customer and purpose</h2>
            <p className="mt-3 text-meta font-semibold">
              {record.contact.name || 'Name not recorded'}
            </p>
            <p className="mt-1 text-tiny text-ink-500">
              {record.contact.phone || 'Phone not recorded'}
            </p>
            <p className="mt-4 rounded-md bg-ink-25 p-3 text-meta text-ink-700">
              {record.purpose || 'Purpose not recorded'}
            </p>
          </section>
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="text-h4 font-bold">Arrival details</h2>
            {record.arrival ? (
              <div className="mt-3 text-meta text-ink-700">
                <MapPin className="mb-2 size-5 text-brand-700" />
                <p>{record.arrival.address || 'Address not provided'}</p>
                <p className="mt-3 text-tiny">
                  Host: {record.arrival.hostName || 'Not recorded'} ·{' '}
                  {record.arrival.hostPhone || 'No phone'}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-meta text-ink-500">Available only for confirmed visits.</p>
            )}
          </section>
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="text-h4 font-bold">Record tools</h2>
            <div className="mt-3 space-y-2">
              <a
                className="block text-meta font-semibold text-brand-700 hover:underline"
                href={`/admin/bookings/${record.id}/summary`}
              >
                Download summary →
              </a>
              <a
                className="block text-meta font-semibold text-brand-700 hover:underline"
                href={`/admin/bookings/${record.id}/calendar`}
              >
                Download calendar →
              </a>
              <Link
                className="block text-meta font-semibold text-brand-700 hover:underline"
                href="/admin/reviews"
              >
                Customer reviews →
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </AdminPage>
  );
}
