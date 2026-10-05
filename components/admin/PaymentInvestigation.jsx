import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import Form from '@/components/navigation/NavigationForm';
import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { ReceiptText, Search, TriangleAlert } from 'lucide-react';
import {
  AdminEmpty,
  AdminFilterBar,
  AdminTable,
  AdminPage,
  AdminPageHeader,
  StatusBadge,
} from './AdminPrimitives';
import Pagination from '@/components/ui/pagination';
import { FieldGrid, SectionCard } from '@/components/portal/DetailLayout';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import ReconcilePayment from './ReconcilePayment';
import { adminStatusMeta } from '@/lib/domain/status';

const TZ = 'Asia/Kolkata';
const ENVIRONMENTS = [
  ['test', 'Test'],
  ['simulated', 'Simulated'],
  ['live', 'Live'],
  ['all', 'All'],
];
const STATES = ['all', 'created', 'processing', 'unknown', 'succeeded', 'failed', 'cancelled'];
const TONE = {
  settled: 'success',
  refunded: 'success',
  refund_pending: 'info',
  awaiting_provider: 'warning',
  needs_review: 'danger',
  closed: 'neutral',
  not_started: 'neutral',
  simulated: 'neutral',
  legacy: 'neutral',
};
const tab = (active) =>
  `inline-flex min-h-11 items-center rounded-full border px-4 text-meta font-semibold ${active ? 'border-brand-700 bg-primary text-white' : 'border-border bg-card text-ink-700 hover:bg-ink-50'}`;
const field = `${sharedFieldClass} mt-1 min-h-11`;
const RECONCILE_OUTCOME = {
  checked: 'Re-fetched from the provider. Only what the provider verified was recorded.',
  unresolved:
    'The provider could not confirm an outcome. Nothing was marked paid; the payment stays pending.',
};

function href(data, changes) {
  const params = {
    environment: data.environment,
    state: data.state,
    attention: data.attention,
    q: data.q,
    from: data.from,
    to: data.to,
    page: String(data.page),
    ...changes,
  };
  const kept = Object.entries(params).filter(
    ([key, value]) =>
      value &&
      !(['state', 'attention'].includes(key) && value === 'all') &&
      !(key === 'page' && value === '1'),
  );
  return `/admin/finance/payments?${new URLSearchParams(kept)}`;
}

function EnvironmentBadge({ environment }) {
  return (
    <StatusBadge
      tone={environment === 'live' ? 'danger' : environment === 'test' ? 'info' : 'neutral'}
    >
      {environment}
    </StatusBadge>
  );
}

/** One card per environment — Test, simulated and live money are never summed together. */
function Totals({ totals, asOf }) {
  if (!totals.length) return null;
  return (
    <section aria-label="Totals by environment" className="mt-6 space-y-3">
      {totals.map((t) => (
        <div key={t.environment} className="rounded-lg border border-border bg-card p-4">
          <p className="flex flex-wrap items-center gap-2 text-meta font-semibold">
            <EnvironmentBadge environment={t.environment} /> {t.count} payment
            {t.count === 1 ? '' : 's'}
            {t.needsReview ? (
              <span className="inline-flex items-center gap-1 text-danger">
                <TriangleAlert className="size-4" aria-hidden="true" /> {t.needsReview} need review
              </span>
            ) : null}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-meta sm:grid-cols-5">
            {[
              ['Expected', t.expectedMinor],
              [
                t.environment === 'simulated' ? 'Simulated (no money)' : 'Captured · verified',
                t.environment === 'simulated' ? t.simulatedMinor : t.capturedMinor,
              ],
              ['Refunded · verified', t.refundedMinor],
              ['Refunds pending', t.refundPendingMinor],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-tiny text-ink-600">{label}</dt>
                <dd className="font-semibold tabular">{money(value)}</dd>
              </div>
            ))}
            <div>
              <dt className="text-tiny text-ink-600">Actual bank money</dt>
              <dd className="font-semibold tabular">
                {money(t.environment === 'live' ? t.capturedMinor : 0)}
              </dd>
            </div>
          </dl>
        </div>
      ))}
      <p className="text-tiny text-ink-600">
        As of {time(asOf, TZ)} · filtered view · totals come from verified ledger records only.
      </p>
    </section>
  );
}

export function PaymentList({ data }) {
  return (
    <AdminPage width="max-w-[1320px]">
      <AdminPageHeader
        eyebrow="Finance"
        title="Payments"
        description="Investigate payments from verified provider facts. Gateway settings stay separate."
        action={
          <Link
            href="/admin/payments"
            className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 underline"
          >
            Gateway settings
          </Link>
        }
      />
      <AdminFilterBar label="Payment filters" className="mt-6 rounded-lg border border-border">
        <nav aria-label="Payment environment" className="flex flex-wrap gap-2">
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
          <Link
            href={href(data, {
              attention: data.attention === 'needs_review' ? 'all' : 'needs_review',
              page: '1',
            })}
            className={tab(data.attention === 'needs_review')}
          >
            Needs review
          </Link>
        </nav>
        <Form
          action="/admin/finance/payments"
          role="search"
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input type="hidden" name="environment" value={data.environment} />
          <input type="hidden" name="attention" value={data.attention} />
          <label className="block lg:col-span-2">
            <span className="text-meta font-medium">Booking reference, payment or provider id</span>
            <input name="q" defaultValue={data.q} className={field} />
          </label>
          <label className="block">
            <span className="text-meta font-medium">State</span>
            <select name="state" defaultValue={data.state} className={field}>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All states' : adminStatusMeta('payment', s).label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-meta font-medium">From (India date)</span>
            <input type="date" name="from" defaultValue={data.from} className={field} />
          </label>
          <label className="block">
            <span className="text-meta font-medium">To (India date)</span>
            <input type="date" name="to" defaultValue={data.to} className={field} />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-white lg:col-start-5">
            <Search className="size-4" aria-hidden="true" /> Filter
          </button>
        </Form>
      </AdminFilterBar>
      <Totals totals={data.totals} asOf={data.asOf} />
      <div className="mt-6">
        <AdminTable
          label="Payment records"
          minWidth={1100}
          columns={[
            'Booking & guest',
            'State',
            'Environment',
            'Expected',
            'Captured / simulated',
            'Refund pending',
            'Details',
          ]}
          empty={
            !data.items.length ? (
              <AdminEmpty
                icon={ReceiptText}
                title="No payments match this view"
                description="Change the environment or filters. An empty list is a real result, not an outage."
              />
            ) : null
          }
        >
          {data.items.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="min-w-60 text-left font-normal">
                <Link
                  href={`/admin/finance/payments/${p.id}`}
                  className="inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
                  aria-label={`Open payment for ${p.bookingReference}`}
                >
                  {p.bookingReference}
                </Link>
                <p className="text-meta text-ink-600">
                  {p.title} · {p.customerName || 'Customer'}
                </p>
                <p className="mt-1 text-meta text-ink-600">
                  {p.purpose} · created {time(p.createdAt, TZ)}
                </p>
              </th>
              <td>
                <StatusBadge tone={TONE[p.status.key]}>{p.status.label}</StatusBadge>
              </td>
              <td>
                <EnvironmentBadge environment={p.environment} />
              </td>
              <td className="whitespace-nowrap tabular">{money(p.expectedMinor)}</td>
              <td className="whitespace-nowrap font-semibold tabular">
                {p.environment === 'simulated'
                  ? `Simulated ${money(p.simulatedMinor)}`
                  : `Captured ${money(p.capturedMinor)}`}
              </td>
              <td className="whitespace-nowrap tabular">{money(p.refundPendingMinor)}</td>
              <td>
                <Link
                  href={`/admin/finance/payments/${p.id}`}
                  aria-label={`Inspect payment for ${p.bookingReference}`}
                  className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Inspect
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <Pagination
        page={data.page}
        pageSize={25}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Payment pages"
        noun="payments"
        className="mt-4"
      />
    </AdminPage>
  );
}

function Rows({ items, empty, render }) {
  return items.length ? (
    <ul className="divide-y divide-border">{items.map(render)}</ul>
  ) : (
    <p className="p-5 text-meta text-ink-600">{empty}</p>
  );
}

export function PaymentDetail({ payment: p }) {
  return (
    <AdminPage width="max-w-[1180px]">
      <AdminPageHeader
        breadcrumbs={[
          { href: '/admin/finance/payments', label: 'Payments' },
          { label: p.bookingReference },
        ]}
        eyebrow="Payment investigation"
        title={`${p.booking.title} · ${p.bookingReference}`}
        description={`${p.provider} · ${p.purpose} collection · created ${time(p.createdAt, TZ)}`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EnvironmentBadge environment={p.environment} />
        <StatusBadge tone={TONE[p.status.key]}>{p.status.label}</StatusBadge>
        <Link
          href={`/admin/bookings/${p.booking.id}?tab=payments`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Booking record
        </Link>
        <Link
          href={`/admin/bookings/${p.booking.id}?tab=cases`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Open a booking case
        </Link>
        <Link
          href={`/admin/customers/${p.booking.customerId}`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Customer
        </Link>
        <Link
          href={`/admin/properties/${p.booking.propertyId}`}
          className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
        >
          Property
        </Link>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <SectionCard id="summary" title="Money" description="Verified provider facts only">
            <FieldGrid
              fields={[
                { label: 'Expected', value: money(p.expectedMinor) },
                p.environment === 'simulated'
                  ? { label: 'Simulated (no money moved)', value: money(p.simulatedMinor) }
                  : { label: 'Captured · verified', value: money(p.capturedMinor) },
                { label: 'Refunded · verified', value: money(p.refundedMinor) },
                { label: 'Refunds pending', value: money(p.refundPendingMinor) },
                {
                  label: 'Actual bank money',
                  value: money(p.environment === 'live' ? p.capturedMinor : 0),
                },
                { label: 'Payment state', value: p.state },
                { label: 'Provider order', value: p.providerOrderId ?? 'Not linked', mono: true },
                { label: 'Payment record id', value: p.id, mono: true },
              ]}
            />
          </SectionCard>
          <SectionCard id="attempts" title="Attempts" flush>
            <Rows
              items={p.attempts}
              empty="No provider attempt was started."
              render={(a) => (
                <li key={a.id} className="px-5 py-3 text-meta">
                  <p className="font-semibold">
                    Attempt {a.number} · {a.state}
                  </p>
                  <p className="text-ink-600">
                    {a.providerPaymentId ?? 'no provider payment id'} · {money(a.expectedMinor)} ·
                    started {time(a.startedAt, TZ)}
                    {a.completedAt ? ` · completed ${time(a.completedAt, TZ)}` : ''}
                    {a.failureCode ? ` · ${a.failureCode}` : ''}
                  </p>
                </li>
              )}
            />
          </SectionCard>
          <SectionCard
            id="transactions"
            title="Verified transactions and allocations"
            description="Allocations split each capture across visits and components"
            flush
          >
            <Rows
              items={p.transactions}
              empty="No verified transaction. Nothing has been captured."
              render={(t) => (
                <li key={t.id} className="space-y-2 px-5 py-4 text-meta">
                  <p className="font-semibold">
                    {t.kind} · {t.outcome} ·{' '}
                    {money(
                      t.kind === 'simulated'
                        ? t.simulatedMinor
                        : t.capturedMinor || t.authorizedMinor,
                    )}
                  </p>
                  <p className="text-ink-600">
                    {t.providerPaymentId ?? t.reference} · verified {time(t.verifiedAt, TZ)}{' '}
                    {t.evidence ? `· evidence ${t.evidence}` : ''}
                  </p>
                  {t.allocations.length ? (
                    <ul className="list-inside list-disc text-ink-700">
                      {t.allocations.map((x) => (
                        <li key={x.id}>
                          {x.visitReference} ({x.visitState}) · {x.component} ·{' '}
                          {money(x.actualMinor || x.simulatedMinor)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )}
            />
          </SectionCard>
          <SectionCard
            id="refunds"
            title="Refunds"
            description="Open a refund for its status, provider events and commands"
            action={
              p.environment === 'test' && p.capturedMinor > 0 ? (
                <Link
                  href={`/admin/finance/refunds/new?order=${p.booking.id}`}
                  className="text-tiny font-semibold text-brand-700 underline"
                >
                  Request a refund
                </Link>
              ) : null
            }
            flush
          >
            <Rows
              items={p.refunds}
              empty="No refund obligation."
              render={(r) => (
                <li key={r.id} className="space-y-1 px-5 py-4 text-meta">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <Link
                      href={`/admin/finance/refunds/${r.id}`}
                      className="text-brand-700 underline"
                    >
                      {money(r.expectedMinor)}
                    </Link>{' '}
                    ·{' '}
                    <StatusBadge
                      tone={
                        r.state === 'succeeded'
                          ? 'success'
                          : r.state === 'unknown'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {r.state}
                    </StatusBadge>
                  </p>
                  <p className="text-ink-600">
                    {r.reason} · requested {time(r.createdAt, TZ)}
                    {r.providerRefundId ? ` · ${r.providerRefundId}` : ''}
                    {r.execution.failureCode ? ` · ${r.execution.failureCode}` : ''}
                  </p>
                  <p className="text-ink-700">
                    {r.allocations
                      .map((x) => `${x.visitReference} ${x.component} ${money(x.expectedMinor)}`)
                      .join(' · ')}
                  </p>
                </li>
              )}
            />
          </SectionCard>
          <SectionCard
            id="events"
            title="Provider events"
            description="Signed webhooks, stored as allowlisted fields only"
            flush
          >
            <Rows
              items={p.events}
              empty="No provider event received for this payment."
              render={(e) => (
                <li key={e.id} className="px-5 py-3 text-meta">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {e.type}{' '}
                    <StatusBadge
                      tone={
                        e.state === 'processed'
                          ? 'success'
                          : e.state === 'failed'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {e.state}
                    </StatusBadge>
                  </p>
                  <p className="text-ink-600">
                    {e.externalEventId} · signature verified · received {time(e.receivedAt, TZ)}
                    {e.processedAt ? ` · processed ${time(e.processedAt, TZ)}` : ''} · attempts{' '}
                    {e.attempts}
                    {e.failureCode ? ` · ${e.failureCode}` : ''}
                  </p>
                </li>
              )}
            />
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard id="reconcile" title="Reconciliation">
            <div className="space-y-3 text-meta">
              {p.execution ? (
                <FieldGrid
                  fields={[
                    { label: 'Execution', value: p.execution.state },
                    { label: 'Next check', value: time(p.execution.nextCheckAt, TZ) },
                    { label: 'Gateway config', value: `Version ${p.execution.configVersion}` },
                    { label: 'Pinned key', value: p.execution.credential, mono: true },
                    p.execution.failureCode
                      ? { label: 'Last provider error', value: p.execution.failureCode }
                      : null,
                  ]}
                />
              ) : (
                <p>No provider execution: {p.status.label.toLowerCase()}.</p>
              )}
              {!p.gatewayEnabled && p.environment === 'test' ? (
                <p className="rounded-md bg-warning-bg p-2 text-warning">
                  New payment attempts are paused. This existing payment is still reconciled.
                </p>
              ) : null}
              {p.reconciliations[0] ? (
                <p role="status" className="rounded-md bg-info-bg p-2 text-ink-800">
                  Last re-fetch · {p.reconciliations[0].by ?? 'admin'} ·{' '}
                  {time(p.reconciliations[0].at, TZ)}:{' '}
                  {RECONCILE_OUTCOME[p.reconciliations[0].outcome] ?? p.reconciliations[0].outcome}{' '}
                  Payment is now {p.reconciliations[0].stateAfter}.
                </p>
              ) : null}
              {p.canReconcile ? (
                <ReconcilePayment key={p.state} paymentId={p.id} requestKey={randomUUID()} />
              ) : (
                <p className="text-ink-600">Nothing to re-fetch: {p.status.label.toLowerCase()}.</p>
              )}
            </div>
          </SectionCard>
          <SectionCard id="history" title="History" flush>
            <Rows
              items={[
                ...p.history.map((h) => ({
                  ...h,
                  key: `${h.kind}-${h.at}`,
                  text: h.kind.replaceAll('_', ' '),
                })),
                ...p.reconciliations.map((r) => ({
                  at: r.at,
                  key: `r-${r.at}`,
                  text: `re-fetch by ${r.by ?? 'admin'}: ${r.outcome}${r.code ? ` (${r.code})` : ''} → ${r.stateAfter}`,
                })),
              ].sort((a, b) => (a.at < b.at ? -1 : 1))}
              empty="No recorded history."
              render={(h) => (
                <li key={h.key} className="px-5 py-3 text-meta">
                  <span className="font-semibold capitalize">{h.text}</span> · {time(h.at, TZ)}
                </li>
              )}
            />
          </SectionCard>
        </div>
      </div>
    </AdminPage>
  );
}
