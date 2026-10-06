import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { CalendarDays, Clock, MapPin, ArrowUpRight } from 'lucide-react';
import {
  bookingMoney as money,
  bookingTime as time,
  describeVisit,
} from '@/lib/domain/booking-record';
import { VisitLifecycle } from '@/components/customer/VisitLifecycle';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import { AdminOrderCases } from '@/components/booking/CasePanels';
import CopyChip from '@/components/portal/CopyChip';
import { buttonVariants } from '@/components/ui/button';
import { adminDateTime } from '@/lib/domain/admin-display';
import { adminBookingHref } from '@/lib/domain/admin-booking-navigation';
import { AdminPageHeader, AdminReadOnly, StatusBadge } from './AdminPrimitives';
import {
  DetailTabs,
  FieldGrid,
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
export default function AdminBookingDetail({
  record,
  tab,
  params,
  listHref = '/admin/bookings',
  capabilities = [],
  sheet = false,
}) {
  const writable = capabilities.includes('admin.records.write');
  const canRead = (scope) => capabilities.includes(`admin.${scope}.read`);
  const test = record.payments.some((payment) => payment.environment === 'test');
  const total =
    record.rentMinor == null || record.feeMinor == null ? null : record.rentMinor + record.feeMinor;
  const livePayments = record.payments.filter((payment) => payment.environment === 'live');
  const captured = livePayments.reduce((sum, payment) => sum + (payment.capturedMinor ?? 0), 0);
  const refunded = livePayments.reduce((sum, payment) => sum + (payment.refundedMinor ?? 0), 0);
  const guests = record.visits.reduce((sum, visit) => sum + (visit.guests || 0), 0);
  const tabs = [
    { key: 'visits', label: 'Visits', count: record.visits.length },
    { key: 'payments', label: 'Payments', count: record.payments.length },
    { key: 'guest', label: 'Guest' },
    { key: 'cases', label: 'Cases', count: (record.cases ?? []).length },
    { key: 'records', label: 'History' },
  ];
  const active = pickTab(tab, tabs);

  return (
    <div
      className={
        sheet
          ? 'min-w-0'
          : 'mx-auto w-full min-w-0 max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8'
      }
    >
      <AdminPageHeader
        backHref={listHref}
        backLabel={listHref.startsWith('/admin/search') ? 'Search results' : 'Bookings'}
        title={record.title}
        description={`Booked ${adminDateTime(record.createdAt)}`}
        action={
          capabilities.includes('admin.payments.write') ? (
            <Link
              className={buttonVariants({ variant: 'outline' })}
              href={`/admin/disputes/new?order=${record.id}`}
            >
              Open dispute or deposit case <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CopyChip label="Booking reference" value={record.reference} />
        <StatusBadge domain="booking" state={record.state} />
        {test ? <StatusBadge tone="warning">Test payment evidence</StatusBadge> : null}
        <span className="text-meta text-ink-600">Visit times: {record.timeZone}</span>
      </div>
      {!writable ? (
        <div className="mt-4">
          <AdminReadOnly />
        </div>
      ) : null}
      {sheet ? (
        <nav aria-label="Record sections" className="mt-6 overflow-x-auto border-b border-border">
          <div className="flex flex-wrap gap-1">
            {tabs.map((section) => (
              <Link
                key={section.key}
                href={adminBookingHref(params, { booking: record.id, recordTab: section.key })}
                scroll={false}
                aria-current={active === section.key ? 'page' : undefined}
                className="inline-flex min-h-11 items-center px-3 text-meta font-semibold text-ink-600 aria-[current=page]:text-brand-800 aria-[current=page]:border-b-2 aria-[current=page]:border-brand-700"
              >
                {section.label}
                {section.count != null ? ` (${section.count})` : ''}
              </Link>
            ))}
          </div>
        </nav>
      ) : (
        <DetailTabs
          wrap
          tabs={tabs}
          active={active}
          basePath={`/admin/bookings/${record.id}`}
          params={params}
        />
      )}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 [&_dt]:text-meta [&_dt]:font-medium [&_dt]:tracking-normal [&_dt]:normal-case [&_h2+p]:text-meta">
          {active === 'visits' ? (
            <SectionCard
              id="visits"
              title="Visit lifecycle"
              description="Payment status applies to the booking; each visit has its own state and evidence."
              flush
            >
              {!record.visits.length ? (
                <p className="p-5 text-meta text-ink-600">No visits recorded for this booking.</p>
              ) : null}
              <div className="divide-y divide-border">
                {record.visits.map((visit) => (
                  <article key={visit.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-ink-900">
                          {describeVisit(visit, { timeZone: record.timeZone })}
                        </h3>
                        <p className="mt-1 text-meta text-ink-500">{visit.reference}</p>
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
                    <div className="mt-5 border-t border-border pt-4">
                      {visit.operation && (
                        <p className="mb-3 text-sm font-semibold">{visit.operation.label}</p>
                      )}
                      <VisitEvidence
                        visit={visit}
                        orderId={record.id}
                        base="/admin/bookings"
                        timeZone={record.timeZone}
                        admin
                        writable={writable}
                        canReport={writable}
                        action={
                          writable ? (
                            <VisitLifecycle
                              key={`${visit.id}-${visit.version}`}
                              requestKey={randomUUID()}
                              visit={visit}
                              admin
                            />
                          ) : null
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {active === 'cases' ? (
            <SectionCard
              id="cases"
              title="Booking cases"
              description="Change, cancellation and operational requests for exact visits"
              flush
            >
              <AdminOrderCases record={record} writable={writable} />
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
                    <div className="flex flex-wrap justify-between gap-3">
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
                    {canRead('payments') ? (
                      <Link
                        href={`/admin/finance/payments/${payment.id}`}
                        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline"
                      >
                        Investigate payment
                      </Link>
                    ) : null}
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
                    {
                      label: 'Phone',
                      value: record.contact.withheld
                        ? 'Contact hidden'
                        : record.contact.phone || 'Not recorded',
                    },
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
            <div className="space-y-5">
              <SectionCard id="policy" title="Accepted policy">
                <FieldGrid
                  fields={[
                    { label: 'Policy version', value: record.policy?.version || 'Not recorded' },
                    {
                      label: 'Cancellation tier',
                      value: record.policy?.cancellationTier || 'Not recorded',
                    },
                  ]}
                />
                {record.policy?.houseRules?.length ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-meta">
                    {record.policy.houseRules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-meta text-ink-600">No accepted house rules recorded.</p>
                )}
                {record.policy?.publications ? (
                  <details className="mt-4">
                    <summary className="min-h-11 cursor-pointer text-meta font-semibold">
                      Accepted publication snapshot
                    </summary>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-meta">
                      {JSON.stringify(record.policy.publications, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </SectionCard>
              <SectionCard id="history" title="Booking history">
                <RowList
                  items={record.events || []}
                  empty="No lifecycle events recorded."
                  render={(event, index) => (
                    <li key={`${event.at}-${index}`} className="p-4 text-meta">
                      <p className="font-semibold">{event.kind.replaceAll('_', ' ')}</p>
                      <p className="mt-1 text-ink-600">{time(event.at, record.timeZone)}</p>
                    </li>
                  )}
                />
              </SectionCard>
              <SectionCard id="records" title="Record downloads">
                <ul className="space-y-3 text-meta">
                  <li>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline"
                      href={`/admin/bookings/${record.id}/summary`}
                    >
                      <Clock className="size-4" aria-hidden="true" /> Download summary
                    </a>
                  </li>
                  <li>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline"
                      href={`/admin/bookings/${record.id}/calendar`}
                    >
                      <CalendarDays className="size-4" aria-hidden="true" /> Download calendar
                    </a>
                  </li>
                  {canRead('reviews') ? (
                    <li>
                      <Link
                        className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline"
                        href="/admin/reviews"
                      >
                        Customer reviews
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </SectionCard>
            </div>
          ) : null}
        </div>
        <aside className="min-w-0 space-y-5" aria-label="Booking context">
          <SectionCard title="Booking amount">
            <p className="text-h3 font-semibold tabular">{money(total)}</p>
            <p className="mt-1 text-meta text-ink-600">Booked total / rent + fee</p>
            <dl className="mt-5 space-y-3 text-meta">
              <div className="flex justify-between gap-3">
                <dt>Rent</dt>
                <dd className="tabular">{money(record.rentMinor)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Fee</dt>
                <dd className="tabular">{money(record.feeMinor)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-3">
                <dt>Live captured</dt>
                <dd className="tabular">{money(captured)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Live refunded</dt>
                <dd className="tabular">{money(refunded)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-meta leading-6 text-ink-600">
              Booked amounts are not collected cash. Live totals use provider capture and successful
              refund evidence.
            </p>
            {test ? (
              <p className="mt-3 text-meta leading-6 text-warning">
                Test captures and refunds are excluded. The Test gateway collects no actual bank
                money.
              </p>
            ) : null}
          </SectionCard>
          <SectionCard title="Record context">
            <p className="text-meta leading-6 text-ink-700">
              {record.visits.length} visits / {guests} guests across visits.
            </p>
            {new Set(record.visits.map((v) => v.state)).size > 1 ? (
              <p className="mt-3 text-meta text-ink-600">
                Mixed visit states. Inspect each visit independently.
              </p>
            ) : null}
            {record.relationships ? (
              <nav aria-label="Related records" className="mt-3 flex flex-col items-start">
                {canRead('properties') ? (
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 hover:underline"
                    href={`/admin/properties/${record.relationships.propertyId}`}
                  >
                    Property detail <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
                {canRead('clients') ? (
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 hover:underline"
                    href={`/admin/clients/${record.relationships.clientId}`}
                  >
                    Owner detail <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
                {canRead('customers') ? (
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 hover:underline"
                    href={`/admin/customers/${record.relationships.customerId}`}
                  >
                    Customer detail <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
