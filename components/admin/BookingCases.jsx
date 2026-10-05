import Form from '@/components/navigation/NavigationForm';
import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { ClipboardList, Search } from 'lucide-react';
import {
  AdminEmpty,
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminReadOnly,
  StatusBadge,
} from './AdminPrimitives';
import Pagination from '@/components/ui/pagination';
import { adminCaseHref as listHref } from '@/lib/domain/admin-booking-navigation';
import { FieldGrid, SectionCard } from '@/components/portal/DetailLayout';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { AssignCaseForm, CaseMessageForm, ResolveCaseForm } from '@/components/booking/CaseForms';
import { CASE_TYPES } from '@/lib/domain/booking-cases';
import { CaseState, CaseUpdates } from '@/components/booking/CasePanels';

const TZ = 'Asia/Kolkata';
const REQUESTER = { customer: 'Customer', owner: 'Owner', admin: 'Rentra' };
const tabClass = (active) =>
  `inline-flex min-h-11 items-center rounded-full border px-4 text-meta font-semibold ${active ? 'border-brand-700 bg-primary text-white' : 'border-border bg-card text-ink-700 hover:bg-ink-50'}`;

export function BookingCaseList({ data }) {
  return (
    <AdminPage width="max-w-[1320px]">
      <AdminPageHeader
        eyebrow="Operations"
        title="Booking cases"
        description="Owner cancellations, customer change requests, no-shows and operational issues. Every resolution is previewed and happens once."
      />
      <nav aria-label="Case filters" className="mt-6 flex flex-wrap gap-2">
        <Link
          href={listHref(data, { state: 'open', assigned: 'all', page: '1' })}
          className={tabClass(data.state === 'open' && data.assigned === 'all')}
          aria-current={data.state === 'open' && data.assigned === 'all' ? 'page' : undefined}
        >
          Open ({data.summary.open})
        </Link>
        <Link
          href={listHref(data, { state: 'open', assigned: 'unassigned', page: '1' })}
          className={tabClass(data.state === 'open' && data.assigned === 'unassigned')}
          aria-current={
            data.state === 'open' && data.assigned === 'unassigned' ? 'page' : undefined
          }
        >
          Unassigned ({data.summary.unassigned})
        </Link>
        <Link
          href={listHref(data, { state: 'open', assigned: 'me', page: '1' })}
          className={tabClass(data.state === 'open' && data.assigned === 'me')}
          aria-current={data.state === 'open' && data.assigned === 'me' ? 'page' : undefined}
        >
          Assigned to me ({data.summary.mine})
        </Link>
        <Link
          href={listHref(data, { state: 'resolved', assigned: 'all', page: '1' })}
          className={tabClass(data.state === 'resolved' && data.assigned === 'all')}
          aria-current={data.state === 'resolved' && data.assigned === 'all' ? 'page' : undefined}
        >
          Resolved
        </Link>
        <Link
          href={listHref(data, { state: 'all', assigned: 'all', page: '1' })}
          className={tabClass(data.state === 'all' && data.assigned === 'all')}
          aria-current={data.state === 'all' && data.assigned === 'all' ? 'page' : undefined}
        >
          All
        </Link>
      </nav>
      <Form
        action="/admin/booking-cases"
        className="mt-4 flex flex-wrap items-end gap-2"
        role="search"
      >
        <input type="hidden" name="state" value={data.state} />
        <input type="hidden" name="assigned" value={data.assigned} />
        <label className="block min-w-56 flex-1">
          <span className="text-meta font-medium">Search case or booking reference, property</span>
          <input
            name="q"
            defaultValue={data.q}
            className="mt-1 block min-h-11 w-full rounded-md border border-input bg-card p-2 text-base md:text-sm"
          />
        </label>
        <label className="block">
          <span className="text-meta font-medium">Type</span>
          <select
            name="type"
            defaultValue={data.type}
            className="mt-1 block min-h-11 rounded-md border border-input bg-card p-2 text-base md:text-sm"
          >
            <option value="all">All types</option>
            {CASE_TYPES.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-white">
          <Search className="size-4" aria-hidden="true" />
          Filter
        </button>
      </Form>
      <div className="mt-6">
        {data.items.length ? (
          <AdminTable
            label="Booking cases"
            minWidth={900}
            columns={['Case / booking', 'Property', 'Request', 'State', 'Assignment', 'View']}
          >
            {data.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <p className="font-semibold">{item.reference}</p>
                  <p className="mt-1 text-ink-600">{item.orderReference}</p>
                </td>
                <td className="px-4 py-4">{item.title}</td>
                <td className="px-4 py-4">
                  <p>{CASE_TYPES.find(([value]) => value === item.type)?.[1] || item.type}</p>
                  <p className="mt-1 text-ink-600">
                    {item.visitCount} visit{item.visitCount === 1 ? '' : 's'} ·{' '}
                    {REQUESTER[item.requesterKind]}
                  </p>
                  <p className="mt-1 text-ink-600">{time(item.createdAt, TZ)}</p>
                </td>
                <td className="px-4 py-4">
                  <CaseState item={{ ...item, outcomeLabel: item.outcome?.replaceAll('_', ' ') }} />
                </td>
                <td className="px-4 py-4">{item.assigneeName || 'Unassigned'}</td>
                <td className="px-4 py-4">
                  <Link
                    href={listHref(data, { case: item.id })}
                    scroll={false}
                    aria-label={`Open case ${item.reference}`}
                    className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmpty
            icon={ClipboardList}
            title="No cases here"
            description="Owners request cancellations from their booking page; admins open cases from a booking's Cases tab."
          />
        )}
      </div>
      <Pagination
        page={data.page}
        pageSize={20}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Case pages"
        noun="cases"
        className="mt-4"
      />
    </AdminPage>
  );
}

export function BookingCaseDetail({
  bookingCase: c,
  capabilities = [],
  listHref = '/admin/booking-cases',
  sheet = false,
}) {
  const writable = capabilities.includes('admin.records.write');
  const open = c.state === 'open';
  return (
    <div
      className={
        sheet
          ? 'min-w-0'
          : 'mx-auto w-full min-w-0 max-w-(--container-workspace) px-4 py-6 sm:px-6 sm:py-8 lg:px-8'
      }
    >
      <AdminPageHeader
        breadcrumbs={[{ href: listHref, label: 'Booking cases' }, { label: c.reference }]}
        eyebrow={c.typeLabel}
        title={`${c.reference} · ${c.order.title}`}
        description={c.reason}
      />
      {!writable ? (
        <div className="mt-4">
          <AdminReadOnly />
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CaseState item={c} />
        <StatusBadge tone="info">Version {c.version}</StatusBadge>
        <Link
          href={`/admin/bookings/${c.order.id}?tab=cases`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Booking {c.order.reference}
        </Link>
        {capabilities.includes('admin.properties.read') ? (
          <Link
            href={`/admin/properties/${c.order.propertyId}`}
            className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
          >
            Property
          </Link>
        ) : null}
      </div>
      <div className="mt-6 grid gap-6 2xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <SectionCard id="summary" title="Request">
            <FieldGrid
              fields={[
                { label: 'Requested by', value: `${REQUESTER[c.requesterKind]} via ${c.source}` },
                { label: 'Opened by', value: `${c.createdBy} · ${time(c.createdAt, TZ)}` },
                { label: 'Requested outcome', value: c.requestedOutcome },
                { label: 'Accepted policy', value: c.order.cancellationTier ?? 'Not recorded' },
                { label: 'Customer', value: c.order.customerName },
                { label: 'Booking state', value: c.order.state },
                c.requestedChange
                  ? {
                      label: 'Requested change',
                      value: `${c.requestedChange.dates.join(', ')} · ${c.requestedChange.slot.replaceAll('_', ' ')} · ${c.requestedChange.guests} guests (not reserved)`,
                    }
                  : null,
                !open
                  ? {
                      label: 'Outcome',
                      value: `${c.outcomeLabel} · ${c.resolvedBy ?? 'Admin'} · ${time(c.resolvedAt, TZ)}`,
                    }
                  : null,
                !open && c.refundBasis
                  ? {
                      label: 'Refund basis',
                      value: c.refundBasis === 'full' ? 'Full refund' : 'Accepted policy',
                    }
                  : null,
                c.cancellation
                  ? {
                      label: 'Test refund requested',
                      value: `${money(c.cancellation.refundMinor)} in ${c.cancellation.refundCount} obligation(s)`,
                    }
                  : null,
              ]}
            />
            {!open ? <p className="mt-4 text-meta">{c.outcomeNote}</p> : null}
          </SectionCard>
          <SectionCard
            id="visits"
            title="Visits in this case"
            description="Exact visits; other visits on the booking are not affected."
            flush
          >
            <ul className="divide-y divide-border">
              {c.visits.map((visit) => (
                <li key={visit.id} className="space-y-1 px-5 py-4 text-meta">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {visit.slot === 'hourly'
                      ? visit.label
                      : `${visit.date} · ${visit.slot.replaceAll('_', ' ')}`}{' '}
                    · {visit.reference}
                    <StatusBadge
                      tone={
                        visit.state === 'cancelled'
                          ? 'danger'
                          : visit.state === 'confirmed'
                            ? 'success'
                            : 'warning'
                      }
                    >
                      {visit.state.replaceAll('_', ' ')}
                    </StatusBadge>
                    {visit.provenance !== 'real' ? (
                      <StatusBadge tone="warning">Test / simulation</StatusBadge>
                    ) : null}
                  </p>
                  <p>
                    {visit.startsAt
                      ? `${time(visit.startsAt, TZ)} – ${time(visit.endsAt, TZ)}`
                      : 'Hours need reconciliation'}{' '}
                    · rent {money(visit.rentMinor)} + fee {money(visit.feeMinor)}
                  </p>
                  <p className="text-ink-600">
                    Evidence {visit.evidenceCount} · photos {visit.photoCount} · open incidents{' '}
                    {visit.openIncidents}
                    {visit.cancellationReason ? ` · ${visit.cancellationReason}` : ''} ·{' '}
                    <Link href={`/admin/bookings/${c.order.id}?tab=visits`} className="underline">
                      evidence on the booking
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
          {open && writable ? (
            <SectionCard
              id="resolve"
              title="Resolve"
              description="Resolved once. Replacement dates are never reserved by a case."
            >
              <ResolveCaseForm
                key={`resolve-${c.version}`}
                bookingCase={c}
                requestKey={randomUUID()}
              />
            </SectionCard>
          ) : null}
        </div>
        <div className="space-y-6">
          {open && writable ? (
            <SectionCard id="assignment" title="Assignment">
              <AssignCaseForm key={`assign-${c.version}`} bookingCase={c} />
            </SectionCard>
          ) : null}
          <SectionCard
            id="updates"
            title="Updates"
            description="Each update names who can read it."
          >
            <div className="space-y-4">
              <CaseUpdates updates={c.updates} timeZone={TZ} showAudience />
              {writable ? (
                <CaseMessageForm
                  key={`update-${c.updates.length}`}
                  caseId={c.id}
                  requestKey={randomUUID()}
                  admin
                />
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
