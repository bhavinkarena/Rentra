import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { CalendarDays, Clock, Globe, MapPin, Phone, UserRound } from 'lucide-react';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { VisitLifecycle } from '@/components/customer/VisitLifecycle';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import { AdminPage, StatusBadge } from './AdminPrimitives';
import {
  DetailHeader,
  DetailTabs,
  FieldGrid,
  MetricStrip,
  RowList,
  SectionCard,
  pickTab,
} from '@/components/portal/DetailLayout';

const tone = (state) =>
  ['confirmed', 'completed', 'captured', 'succeeded'].includes(state)
    ? 'success'
    : ['cancelled', 'expired', 'failed'].includes(state)
      ? 'danger'
      : 'warning';
const created = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function AdminBookingDetail({ record, tab, params, listHref = '/admin/bookings' }) {
  const test = record.payments.some((payment) => payment.environment === 'test');
  const total =
    record.rentMinor == null || record.feeMinor == null ? null : record.rentMinor + record.feeMinor;
  const captured = record.payments.reduce((sum, payment) => sum + (payment.capturedMinor ?? 0), 0);
  const refunded = record.payments.reduce((sum, payment) => sum + (payment.refundedMinor ?? 0), 0);
  const guests = record.visits.reduce((sum, visit) => sum + (visit.guests || 0), 0);
  const tabs = [
    { key: 'visits', label: 'Visits', count: record.visits.length },
    { key: 'payments', label: 'Payments', count: record.payments.length },
    { key: 'guest', label: 'Guest & arrival' },
    { key: 'records', label: 'Records' },
  ];
  const active = pickTab(tab, tabs);

  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: listHref, label: 'Bookings' }, { label: record.reference }]}
        title={record.title}
        avatar={record.title}
        badges={[
          { label: record.state, tone: tone(record.state) },
          test ? { label: 'Test payments', tone: 'warning' } : null,
        ].filter(Boolean)}
        id={{ label: 'Booking reference', value: record.reference }}
        chips={[
          { icon: CalendarDays, label: 'Created', value: created(record.createdAt) },
          { icon: Globe, label: 'Times in', value: record.timeZone },
          record.contact?.name ? { icon: UserRound, value: record.contact.name } : null,
          record.contact?.phone ? { icon: Phone, value: record.contact.phone } : null,
        ]}
      />

      {record.relationships && (
        <nav aria-label="Related records" className="my-4 flex flex-wrap gap-4 text-sm">
          <Link
            className="min-h-11 underline"
            href={`/admin/properties/${record.relationships.propertyId}`}
          >
            Property detail
          </Link>
          <Link
            className="min-h-11 underline"
            href={`/admin/clients/${record.relationships.clientId}`}
          >
            Client detail
          </Link>
          <Link
            className="min-h-11 underline"
            href={`/admin/customers/${record.relationships.customerId}`}
          >
            Customer detail
          </Link>
        </nav>
      )}
      <p className="my-3 text-sm">
        Payment status applies to the booking; visit states and evidence are independent.{' '}
        {new Set(record.visits.map((v) => v.state)).size > 1
          ? 'Mixed visit states — inspect each visit below.'
          : ''}
      </p>
      <MetricStrip
        items={[
          {
            label: 'Total',
            value: money(total),
            hint: `rent ${money(record.rentMinor)} + fee ${money(record.feeMinor)}`,
          },
          { label: 'Visits', value: record.visits.length, hint: 'in this booking' },
          { label: 'Guests', value: guests, hint: 'across visits' },
          { label: 'Payments', value: record.payments.length, hint: 'provider records' },
          {
            label: 'Captured',
            value: money(captured),
            hint: test ? 'test gateway — not bank money' : 'verified captures',
            tone: test ? 'warning' : 'neutral',
          },
          { label: 'Refunded', value: money(refunded), hint: 'recorded refunds' },
        ]}
      />

      {test ? (
        <div className="mt-5 rounded-lg border border-warning/25 bg-warning-bg p-4 text-meta text-amber-900">
          <strong>Test booking:</strong> no actual bank money was collected by the test gateway.
        </div>
      ) : null}

      <DetailTabs
        tabs={tabs}
        active={active}
        basePath={`/admin/bookings/${record.id}`}
        params={params}
      />

      <div className="mt-6">
        {active === 'visits' ? (
          <SectionCard
            id="visits"
            title="Visit lifecycle"
            description="Operational evidence and state transitions"
            flush
          >
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
                  <div className="mt-4">
                    <FieldGrid
                      fields={[
                        { label: 'Guests', value: visit.guests },
                        { label: 'Arrival', value: time(visit.startsAt, record.timeZone) },
                        { label: 'Departure', value: time(visit.endsAt, record.timeZone) },
                      ]}
                    />
                  </div>
                  <div className="mt-4 rounded-md bg-ink-25 p-4">
                    {visit.operation && (
                      <p className="mb-3 text-sm font-semibold">{visit.operation.label}</p>
                    )}
                    <VisitEvidence
                      visit={visit}
                      orderId={record.id}
                      base="/admin/bookings"
                      timeZone={record.timeZone}
                      admin
                      action={
                        <VisitLifecycle
                          key={`${visit.id}-${visit.version}`}
                          requestKey={randomUUID()}
                          visit={visit}
                          admin
                        />
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {active === 'payments' ? (
          <SectionCard
            id="payments"
            title="Payments"
            description="Provider outcomes establish success"
            flush
          >
            <RowList
              items={record.payments}
              empty="No verified payment record."
              render={(payment) => (
                <li key={payment.id} className="p-5">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold capitalize">
                      {payment.provider} · {payment.environment}
                    </p>
                    <StatusBadge tone={tone(payment.state)}>{payment.state}</StatusBadge>
                  </div>
                  <div className="mt-4">
                    <FieldGrid
                      fields={[
                        { label: 'Expected', value: money(payment.expectedMinor) },
                        { label: 'Captured', value: money(payment.capturedMinor) },
                        { label: 'Refunded', value: money(payment.refundedMinor) },
                        {
                          label: 'Actual bank collection',
                          value: money(payment.actualBankMinor),
                        },
                      ]}
                    />
                  </div>
                </li>
              )}
            />
          </SectionCard>
        ) : null}

        {active === 'guest' ? (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <SectionCard id="guest" title="Customer and purpose">
              <FieldGrid
                fields={[
                  {
                    label: 'Name',
                    value: record.contact.withheld
                      ? 'Contact hidden — no active fulfillment'
                      : record.contact.name || 'Not recorded',
                  },
                  { label: 'Phone', value: record.contact.phone || 'Not recorded' },
                ]}
              />
              <p className="mt-4 rounded-md bg-ink-25 p-3 text-meta text-ink-700">
                {record.purpose || 'Purpose not recorded'}
              </p>
            </SectionCard>
            <SectionCard id="arrival" title="Arrival details">
              {record.arrival ? (
                <div className="text-meta text-ink-700">
                  <MapPin className="mb-2 size-5 text-brand-700" aria-hidden="true" />
                  <FieldGrid
                    fields={[
                      { label: 'Address', value: record.arrival.address || 'Not provided' },
                      { label: 'Host', value: record.arrival.hostName || 'Not recorded' },
                      { label: 'Host phone', value: record.arrival.hostPhone || 'No phone' },
                    ]}
                  />
                </div>
              ) : (
                <p className="text-meta text-ink-500">Available only for confirmed visits.</p>
              )}
            </SectionCard>
          </div>
        ) : null}

        {active === 'records' ? (
          <SectionCard id="records" title="Record tools">
            <ul className="space-y-3 text-meta">
              <li>
                <a
                  className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline"
                  href={`/admin/bookings/${record.id}/summary`}
                >
                  <Clock className="size-4" aria-hidden="true" /> Download summary →
                </a>
              </li>
              <li>
                <a
                  className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline"
                  href={`/admin/bookings/${record.id}/calendar`}
                >
                  <CalendarDays className="size-4" aria-hidden="true" /> Download calendar →
                </a>
              </li>
              <li>
                <Link
                  className="font-semibold text-brand-700 hover:underline"
                  href="/admin/reviews"
                >
                  Customer reviews →
                </Link>
              </li>
            </ul>
          </SectionCard>
        ) : null}
      </div>
    </AdminPage>
  );
}
