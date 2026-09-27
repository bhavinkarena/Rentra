import Form from 'next/form';
import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { AdminEmpty, AdminPage, AdminPageHeader, StatusBadge } from './AdminPrimitives';
import { FieldGrid, SectionCard } from '@/components/portal/DetailLayout';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { RefundCommand } from './RefundCommands';

const TZ = 'Asia/Kolkata';
const ENVIRONMENTS = [
  ['test', 'Test'],
  ['simulated', 'Simulated'],
  ['live', 'Live'],
  ['all', 'All'],
];
const STATUSES = [
  ['all', 'All'],
  ['attention', 'Needs attention'],
  ['queued', 'Queued'],
  ['processing', 'Processing'],
  ['uncertain', 'Uncertain'],
  ['provider_failed', 'Failed at provider'],
  ['refunded', 'Refunded'],
];
const SOURCE = {
  customer_cancellation: 'Customer cancellation',
  booking_case: 'Booking case',
  late_capture: 'Late capture',
  operator: 'Operator refund',
  other: 'Other',
};
const tab = (active) =>
  `inline-flex min-h-11 items-center rounded-full border px-4 text-meta font-semibold ${active ? 'border-brand-700 bg-brand-700 text-white' : 'border-border bg-card text-ink-700 hover:bg-ink-50'}`;

function href(data, changes) {
  const params = {
    environment: data.environment,
    status: data.status,
    source: data.source,
    q: data.q,
    page: String(data.page),
    ...changes,
  };
  const kept = Object.entries(params).filter(
    ([key, value]) =>
      value &&
      !(['status', 'source'].includes(key) && value === 'all') &&
      !(key === 'page' && value === '1'),
  );
  return `/admin/finance/refunds?${new URLSearchParams(kept)}`;
}

function Status({ status }) {
  return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
}

export function RefundList({ data }) {
  return (
    <AdminPage width="max-w-[1320px]">
      <AdminPageHeader
        eyebrow="Finance"
        title="Refunds"
        description="Every refund obligation, from request to the provider's verified outcome. Nothing reads as refunded until Razorpay confirms it."
      />
      <nav aria-label="Refund environment" className="mt-6 flex flex-wrap gap-2">
        {ENVIRONMENTS.map(([value, label]) => (
          <Link
            key={value}
            href={href(data, { environment: value, page: '1' })}
            className={tab(data.environment === value)}
            aria-current={data.environment === value ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Refund status" className="mt-2 flex flex-wrap gap-2">
        {STATUSES.map(([value, label]) => (
          <Link
            key={value}
            href={href(data, { status: value, page: '1' })}
            className={tab(data.status === value)}
            aria-current={data.status === value ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Form action="/admin/finance/refunds" className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="environment" value={data.environment} />
        <input type="hidden" name="status" value={data.status} />
        <label className="text-meta font-semibold">
          Source
          <select
            name="source"
            defaultValue={data.source}
            className="mt-1 block min-h-11 rounded border border-border bg-card p-2"
          >
            <option value="all">All sources</option>
            {Object.entries(SOURCE).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-meta font-semibold">
          Search
          <input
            name="q"
            defaultValue={data.q}
            placeholder="Refund or booking reference, rfnd_ id"
            className="mt-1 block min-h-11 w-72 max-w-full rounded border border-border bg-card p-2"
          />
        </label>
        <button className="min-h-11 rounded border border-border bg-card px-4 font-semibold">
          Apply
        </button>
      </Form>

      {data.totals.length ? (
        <section aria-label="Totals by environment" className="mt-6 space-y-3">
          {data.totals.map((t) => (
            <div key={t.environment} className="rounded-lg border border-border bg-card p-4">
              <p className="flex flex-wrap items-center gap-2 text-meta font-semibold">
                <StatusBadge
                  tone={
                    t.environment === 'live'
                      ? 'danger'
                      : t.environment === 'test'
                        ? 'info'
                        : 'neutral'
                  }
                >
                  {t.environment}
                </StatusBadge>
                {t.count} refund{t.count === 1 ? '' : 's'}
                {t.attention ? (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <TriangleAlert className="size-4" aria-hidden="true" /> {t.attention} need
                    attention
                  </span>
                ) : null}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-meta sm:grid-cols-4">
                {[
                  ['Requested', t.expectedMinor],
                  ['Refunded · verified', t.refundedMinor],
                  ['Pending or uncertain', t.pendingMinor],
                  ['Actual bank money', t.environment === 'live' ? t.refundedMinor : 0],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-tiny text-ink-600">{label}</dt>
                    <dd className="font-semibold tabular">{money(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <p className="text-tiny text-ink-600">
            As of {time(data.asOf, TZ)} · filtered view · environments are never added together.
          </p>
        </section>
      ) : null}

      <section
        aria-label="Refund obligations"
        className="mt-6 overflow-hidden rounded-lg border border-border bg-card"
      >
        {data.items.length ? (
          <ul className="divide-y divide-border">
            {data.items.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-meta"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/finance/refunds/${r.id}`}
                    className="font-semibold text-brand-700 underline"
                  >
                    {money(r.expectedMinor)} · {r.bookingReference}
                  </Link>
                  <p className="text-tiny text-ink-600">
                    {SOURCE[r.source]} · {r.title} · requested {time(r.createdAt, TZ)}
                    {r.execution.failureCode ? ` · ${r.execution.failureCode}` : ''}
                  </p>
                </div>
                <Status status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty
            title="No refunds match"
            description="Try another environment, status or search."
          />
        )}
      </section>
      <div className="mt-4 flex items-center justify-between text-meta">
        <span>
          Page {data.page} of {data.pages} · {data.total} total
        </span>
        <span className="flex gap-3">
          {data.page > 1 ? (
            <Link
              className="font-semibold text-brand-700 underline"
              href={href(data, { page: String(data.page - 1) })}
            >
              Previous
            </Link>
          ) : null}
          {data.page < data.pages ? (
            <Link
              className="font-semibold text-brand-700 underline"
              href={href(data, { page: String(data.page + 1) })}
            >
              Next
            </Link>
          ) : null}
        </span>
      </div>
    </AdminPage>
  );
}

const ORIGIN = {
  customer_cancellation: 'Customer cancellation',
  booking_case: 'Booking case',
  operator: 'Operator refund',
  late_capture: 'Late capture after the hold expired',
  other: 'Other',
};

export function RefundDetail({ refund: r }) {
  return (
    <AdminPage width="max-w-[1320px]">
      <AdminPageHeader
        eyebrow="Finance · Refund"
        title={`${money(r.expectedMinor)} refund · ${r.bookingReference}`}
        description={`${r.reference} · ${r.environment}`}
        action={<Status status={r.status} />}
      />
      <div className="mt-4 flex flex-wrap gap-4">
        <Link
          href="/admin/finance/refunds"
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          All refunds
        </Link>
        <Link
          href={`/admin/finance/payments/${r.paymentOrderId}`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Payment
        </Link>
        <Link
          href={`/admin/bookings/${r.booking.id}`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Booking
        </Link>
        {r.origin.caseId ? (
          <Link
            href={`/admin/booking-cases/${r.origin.caseId}`}
            className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
          >
            Case {r.origin.caseReference}
          </Link>
        ) : null}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <SectionCard id="status" title="Where this refund stands">
            <p className="text-meta">{r.status.explanation}</p>
            {r.status.recovery ? (
              <p className="mt-2 text-meta text-ink-700">{r.status.recovery}</p>
            ) : null}
          </SectionCard>
          <SectionCard
            id="money"
            title="Amounts"
            description="Requested versus what the provider verified"
          >
            <FieldGrid
              fields={[
                { label: 'Requested', value: money(r.expectedMinor) },
                { label: 'Refunded · verified', value: money(r.actualMinor) },
                {
                  label: 'Actual bank money',
                  value: money(r.environment === 'live' ? r.actualMinor : 0),
                },
                {
                  label: 'Verified at',
                  value: r.verifiedAt ? time(r.verifiedAt, TZ) : 'Not verified',
                },
                {
                  label: 'Provider refund',
                  value: r.providerRefundId ?? 'Not known yet',
                  mono: true,
                },
                { label: 'Original capture', value: r.providerPaymentId ?? '—', mono: true },
                { label: 'Reason', value: r.reason },
                { label: 'Refund record id', value: r.id, mono: true },
              ]}
            />
          </SectionCard>
          <SectionCard
            id="allocations"
            title="Visits and components"
            description="Each line is capped by its verified capture and earlier refunds"
            flush
          >
            <ul className="divide-y divide-border">
              {r.allocations.map((a) => (
                <li key={`${a.visitReference}-${a.component}`} className="px-5 py-3 text-meta">
                  <span className="font-semibold">
                    {a.visitReference} · {a.component}
                  </span>{' '}
                  ({a.visitState}) · refund {money(a.expectedMinor)} of {money(a.capturedMinor)}{' '}
                  captured · verified {money(a.actualMinor)}
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard
            id="events"
            title="Provider events"
            description="Signed Razorpay webhooks for this refund"
            flush
          >
            {r.events.length ? (
              <ul className="divide-y divide-border">
                {r.events.map((e) => (
                  <li key={e.id} className="px-5 py-3 text-meta">
                    <span className="font-semibold">{e.type}</span> · {e.state}
                    {e.failureCode ? ` · ${e.failureCode}` : ''} · received {time(e.receivedAt, TZ)}{' '}
                    · {e.attempts} attempt{e.attempts === 1 ? '' : 's'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-meta text-ink-600">
                No provider event received for this refund.
              </p>
            )}
          </SectionCard>
          {r.siblings.length ? (
            <SectionCard id="siblings" title="Other refunds on this payment" flush>
              <ul className="divide-y divide-border">
                {r.siblings.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-meta"
                  >
                    <Link
                      href={`/admin/finance/refunds/${s.id}`}
                      className="font-semibold text-brand-700 underline"
                    >
                      {money(s.expectedMinor)} · {SOURCE[s.source]}
                    </Link>
                    <Status status={s.status} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
        <div className="space-y-6">
          {r.status.command ? (
            <SectionCard
              id="command"
              title={r.status.command === 'send' ? 'Send to provider' : 'Check with provider'}
            >
              <p className="mb-3 text-meta text-ink-700">
                {r.status.command === 'send'
                  ? 'Sends this refund to Razorpay Test now. It is sent only once; every later action only looks it up.'
                  : 'Asks Razorpay Test for its own record of this refund. Nothing is resent.'}
              </p>
              <RefundCommand
                key={`${r.status.key}-${r.commands.length}`}
                refundId={r.id}
                command={r.status.command}
                requestKey={randomUUID()}
              />
            </SectionCard>
          ) : null}
          <SectionCard id="origin" title="Where it came from">
            <p className="text-meta">
              {ORIGIN[r.origin.kind] ?? r.origin.kind}
              {r.origin.caseReference ? ` · ${r.origin.caseReference}` : ''}
              {r.origin.by ? ` · by ${r.origin.by}` : ''}
              {r.origin.at ? ` · ${time(r.origin.at, TZ)}` : ''}
            </p>
            {r.origin.reason ? (
              <p className="mt-1 text-meta text-ink-700">{r.origin.reason}</p>
            ) : null}
          </SectionCard>
          <SectionCard id="execution" title="Execution">
            <FieldGrid
              fields={[
                {
                  label: 'Sent to provider',
                  value: r.execution.dispatchedAt ? time(r.execution.dispatchedAt, TZ) : 'Not yet',
                },
                {
                  label: 'Next automatic check',
                  value: r.execution.nextCheckAt ? time(r.execution.nextCheckAt, TZ) : '—',
                },
                { label: 'Last provider problem', value: r.execution.failureCode ?? 'None' },
              ]}
            />
          </SectionCard>
          <SectionCard id="commands" title="Operator actions">
            {r.commands.length ? (
              <ol className="space-y-2 text-meta">
                {r.commands.map((c, index) => (
                  <li key={index}>
                    {time(c.at, TZ)} · {c.by ?? 'Admin'} · {c.outcome}
                    {c.code ? ` · ${c.code}` : ''} · now {c.stateAfter}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-meta text-ink-600">No operator action yet.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </AdminPage>
  );
}
