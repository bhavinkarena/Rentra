import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import Form from '@/components/navigation/NavigationForm';
import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { ReceiptText, Search, TriangleAlert, ArrowUpRight } from 'lucide-react';
import { AdminEmpty, AdminPage, AdminPageHeader, StatusBadge } from './AdminPrimitives';
import Pagination from '@/components/ui/pagination';
import { DetailTabs, pickTab, FieldGrid, SectionCard } from '@/components/portal/DetailLayout';
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
  `inline-flex min-h-11 items-center border-b-2 px-3 text-meta font-semibold ${active ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900'}`;
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
    basis: data.basis,
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
              <dt className="text-tiny text-ink-600">Bank settlement evidence</dt>
              <dd className="font-semibold tabular">Not available</dd>
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
      {data.basis === 'capture' ? (
        <p className="mt-4 text-meta text-ink-600">
          Capture evidence verified {data.from} to {data.to} (IST). Captured amounts use this
          period.{' '}
          <Link href="/admin/finance/payments" className="underline">
            Clear dashboard scope
          </Link>
        </p>
      ) : null}
      <section aria-label="Payment filters" className="mt-6 border-b border-border pb-5">
        <nav
          aria-label="Payment environment"
          className="flex flex-wrap gap-1 border-b border-border"
        >
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
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]"
        >
          <input type="hidden" name="environment" value={data.environment} />
          {data.basis ? <input type="hidden" name="basis" value={data.basis} /> : null}

          <input type="hidden" name="attention" value={data.attention} />
          <label className="block ">
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
          <button className="inline-flex min-h-11 self-end items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-white">
            <Search className="size-4" aria-hidden="true" /> Filter
          </button>
        </Form>
      </section>
      <details className="mt-5 border-b border-border pb-4">
        <summary className="min-h-11 content-center cursor-pointer text-meta font-semibold text-ink-700">
          View filtered totals by environment
        </summary>
        <Totals totals={data.totals} asOf={data.asOf} />
      </details>
      <section
        aria-label="Payment records"
        className="mt-6 overflow-hidden rounded-lg border border-border bg-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="text-h4 font-semibold">Payment records</h2>
          <p className="text-meta text-ink-600">{data.total} matching records</p>
        </div>
        {!data.items.length ? (
          <AdminEmpty
            icon={ReceiptText}
            title="No payments match this view"
            description="Change the environment or filters to search again."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/finance/payments/${p.id}?from=${encodeURIComponent(href(data, {}))}`}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-ink-25 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">
                      {p.bookingReference} · {p.title}
                    </p>
                    <p className="mt-1 text-meta text-ink-600">
                      {p.customerName || 'Customer'} · {p.purpose}
                    </p>
                    <p className="mt-2 text-tiny text-ink-600">Created {time(p.createdAt, TZ)}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-meta">
                    <div>
                      <dt className="text-ink-600">Expected</dt>
                      <dd className="font-semibold tabular">{money(p.expectedMinor)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-600">
                        {p.environment === 'simulated'
                          ? 'Simulated · no money'
                          : 'Captured · verified'}
                      </dt>
                      <dd className="font-semibold tabular">
                        {money(p.environment === 'simulated' ? p.simulatedMinor : p.capturedMinor)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="inline text-ink-600">Refund pending </dt>
                      <dd className="inline tabular">{money(p.refundPendingMinor)}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
                    <StatusBadge tone={TONE[p.status.key]}>{p.status.label}</StatusBadge>
                    <EnvironmentBadge environment={p.environment} />
                    <span className="mt-1 text-meta font-semibold text-brand-700">
                      Inspect payment <ArrowUpRight className="inline size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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

export function PaymentDetail({
  payment: p,
  capabilities = [],
  tab,
  params = {},
  listHref = '/admin/finance/payments',
}) {
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'evidence', label: 'Provider evidence' },
    { key: 'refunds', label: 'Refunds', count: p.refunds.length },
    { key: 'activity', label: 'Activity' },
    { key: 'control', label: 'Reconcile' },
  ];
  const active = pickTab(tab, tabs);
  return (
    <AdminPage width="max-w-[1180px]">
      <AdminPageHeader
        breadcrumbs={[{ href: listHref, label: 'Payments' }, { label: p.bookingReference }]}
        title={`${p.booking.title} · ${p.bookingReference}`}
        description={`${p.provider} · ${p.purpose} collection · created ${time(p.createdAt, TZ)}`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EnvironmentBadge environment={p.environment} />
        <StatusBadge tone={TONE[p.status.key]}>{p.status.label}</StatusBadge>
        {capabilities.includes('admin.records.read') && (
          <Link
            href={`/admin/bookings/${p.booking.id}?tab=payments`}
            className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
          >
            Booking record
          </Link>
        )}
        {capabilities.includes('admin.records.read') && (
          <Link
            href={`/admin/bookings/${p.booking.id}?tab=cases`}
            className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
          >
            Open a booking case
          </Link>
        )}
        {capabilities.includes('admin.customers.read') && (
          <Link
            href={`/admin/customers/${p.booking.customerId}`}
            className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
          >
            Customer
          </Link>
        )}
        {capabilities.includes('admin.properties.read') && (
          <Link
            href={`/admin/properties/${p.booking.propertyId}`}
            className="min-h-11 content-center text-meta font-semibold text-brand-700 underline"
          >
            Property
          </Link>
        )}
      </div>
      <DetailTabs
        tabs={tabs}
        active={active}
        basePath={`/admin/finance/payments/${p.id}`}
        params={params}
        wrap
      />
      <div className="mt-6 space-y-6">
        <div className="space-y-6">
          {active === 'overview' ? (
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
                    label: 'Bank settlement evidence',
                    value: 'Not available',
                  },
                  { label: 'Payment state', value: p.state },
                  { label: 'Provider order', value: p.providerOrderId ?? 'Not linked', mono: true },
                  { label: 'Payment record id', value: p.id, mono: true },
                ]}
              />
            </SectionCard>
          ) : null}
          {active === 'evidence' ? (
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
          ) : null}
          {active === 'evidence' ? (
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
          ) : null}
          {active === 'refunds' ? (
            <SectionCard
              id="refunds"
              title="Refunds"
              description="Open a refund for its status, provider events and commands"
              action={
                capabilities.includes('admin.payments.write') &&
                p.environment === 'test' &&
                p.capturedMinor > 0 ? (
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
          ) : null}
          {active === 'evidence' ? (
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
          ) : null}
        </div>
        <div className="space-y-6">
          {active === 'control' ? (
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
                    {RECONCILE_OUTCOME[p.reconciliations[0].outcome] ??
                      p.reconciliations[0].outcome}{' '}
                    Payment is now {p.reconciliations[0].stateAfter}.
                  </p>
                ) : null}
                {!capabilities.includes('admin.payments.write') ? (
                  <p className="text-meta text-ink-600">
                    Read-only access. Provider reconciliation requires Finance write access.
                  </p>
                ) : p.canReconcile ? (
                  <ReconcilePayment key={p.state} paymentId={p.id} requestKey={randomUUID()} />
                ) : (
                  <p className="text-ink-600">
                    Nothing to re-fetch: {p.status.label.toLowerCase()}.
                  </p>
                )}
              </div>
            </SectionCard>
          ) : null}
          {active === 'activity' ? (
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
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
