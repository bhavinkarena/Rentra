import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { ClipboardList, Search } from 'lucide-react';
import { AdminEmpty, AdminPage, AdminPageHeader, Pager, StatusBadge } from './AdminPrimitives';
import { FieldGrid, SectionCard } from '@/components/portal/DetailLayout';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { AssignCaseForm, CaseMessageForm, ResolveCaseForm } from '@/components/booking/CaseForms';
import { CASE_TYPES } from '@/lib/domain/booking-cases';
import { CaseState, CaseUpdates } from '@/components/booking/CasePanels';

const TZ = 'Asia/Kolkata';
const REQUESTER = { customer: 'Customer', owner: 'Owner', admin: 'Rentra' };
const tabClass = (active) =>
  `inline-flex min-h-11 items-center rounded-full border px-4 text-meta font-semibold ${active ? 'border-brand-700 bg-brand-700 text-white' : 'border-border bg-card text-ink-700 hover:bg-ink-50'}`;

function listHref(data, changes) {
  const params = {
    state: data.state,
    type: data.type,
    assigned: data.assigned,
    q: data.q,
    page: String(data.page),
    ...changes,
  };
  const kept = Object.entries(params).filter(
    ([key, value]) =>
      value &&
      !(['type', 'assigned'].includes(key) && value === 'all') &&
      !(key === 'page' && value === '1'),
  );
  return `/admin/booking-cases?${new URLSearchParams(kept)}`;
}

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
        >
          Open ({data.summary.open})
        </Link>
        <Link
          href={listHref(data, { state: 'open', assigned: 'unassigned', page: '1' })}
          className={tabClass(data.assigned === 'unassigned')}
        >
          Unassigned ({data.summary.unassigned})
        </Link>
        <Link
          href={listHref(data, { state: 'open', assigned: 'me', page: '1' })}
          className={tabClass(data.assigned === 'me')}
        >
          Assigned to me ({data.summary.mine})
        </Link>
        <Link
          href={listHref(data, { state: 'resolved', assigned: 'all', page: '1' })}
          className={tabClass(data.state === 'resolved')}
        >
          Resolved
        </Link>
        <Link
          href={listHref(data, { state: 'all', assigned: 'all', page: '1' })}
          className={tabClass(data.state === 'all')}
        >
          All
        </Link>
      </nav>
      <form
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
            className="mt-1 block min-h-11 w-full rounded border border-border bg-card p-2"
          />
        </label>
        <label className="block">
          <span className="text-meta font-medium">Type</span>
          <select
            name="type"
            defaultValue={data.type}
            className="mt-1 block min-h-11 rounded border border-border bg-card p-2"
          >
            <option value="all">All types</option>
            {CASE_TYPES.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <button className="inline-flex min-h-11 items-center gap-2 rounded bg-brand-700 px-4 font-semibold text-white">
          <Search className="size-4" aria-hidden="true" />
          Filter
        </button>
      </form>
      <div className="mt-6">
        {data.items.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <span className="min-w-0 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/booking-cases/${item.id}`}
                      className="font-bold text-brand-800 underline"
                      aria-label={`Open case ${item.reference}`}
                    >
                      {item.reference}
                    </Link>
                    <CaseState
                      item={{ ...item, outcomeLabel: item.outcome?.replaceAll('_', ' ') }}
                    />
                    <span className="text-meta">
                      {CASE_TYPES.find(([v]) => v === item.type)?.[1]}
                    </span>
                  </span>
                  <span className="block text-tiny text-ink-600">
                    {item.title} · booking {item.orderReference} · {item.visitCount} visit
                    {item.visitCount === 1 ? '' : 's'} · from {REQUESTER[item.requesterKind]} ·
                    opened {time(item.createdAt, TZ)}
                  </span>
                </span>
                <span className="text-tiny text-ink-600">
                  {item.assigneeName ? `Assigned to ${item.assigneeName}` : 'Unassigned'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty
            icon={ClipboardList}
            title="No cases here"
            description="Owners request cancellations from their booking page; admins open cases from a booking's Cases tab."
          />
        )}
      </div>
      <div className="mt-4">
        <Pager
          page={data.page}
          hasNext={data.page < data.pages}
          previousHref={listHref(data, { page: String(data.page - 1) })}
          nextHref={listHref(data, { page: String(data.page + 1) })}
          label="Cases page"
        />
      </div>
    </AdminPage>
  );
}

export function BookingCaseDetail({ bookingCase: c }) {
  const open = c.state === 'open';
  return (
    <AdminPage width="max-w-[1180px]">
      <AdminPageHeader
        breadcrumbs={[
          { href: '/admin/booking-cases', label: 'Booking cases' },
          { label: c.reference },
        ]}
        eyebrow={c.typeLabel}
        title={`${c.reference} · ${c.order.title}`}
        description={c.reason}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CaseState item={c} />
        <StatusBadge tone="info">Version {c.version}</StatusBadge>
        <Link
          href={`/admin/bookings/${c.order.id}?tab=cases`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Booking {c.order.reference}
        </Link>
        <Link
          href={`/admin/properties/${c.order.propertyId}`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Property
        </Link>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
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
                    {visit.date} · {visit.slot.replaceAll('_', ' ')} · {visit.reference}
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
          {open ? (
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
          {open ? (
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
              <CaseMessageForm
                key={`update-${c.updates.length}`}
                caseId={c.id}
                requestKey={randomUUID()}
                admin
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminPage>
  );
}
