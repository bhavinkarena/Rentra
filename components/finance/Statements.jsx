import { adminDateTime } from '@/lib/domain/admin-display';
import { DetailTabs, FieldGrid, SectionCard, pickTab } from '@/components/portal/DetailLayout';
import { ArrowUpRight } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminEmpty } from '@/components/admin/AdminPrimitives';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';

import { displayMoney } from '@/lib/domain/display-money';
import { earningsTime } from '@/lib/domain/owner-earnings';

const labels = {
  quotedRentMinor: 'Quoted rent for contributing visits',
  collectedMinor: 'Verified receipts',
  simulatedMinor: 'Simulated value',
  refundedMinor: 'Completed refunds',
  rentNetMinor: 'Live rent after completed refunds',
  refundPendingMinor: 'Live rent reserved for refunds',
  pendingMinor: 'Pending completion or payout',
  eligibleMinor: 'Accounting eligible',
  heldMinor: 'Held',
  settledMinor: 'Recorded settled',
};
const query = (f) =>
  new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v != null)).toString();
const baseFor = (admin) => (admin ? '/admin/finance' : '/partner');
function Filters({ filters, admin, properties = [], action, activeTab }) {
  return (
    <form
      method="get"
      action={action}
      className={
        admin
          ? 'grid items-end gap-3 border-b border-border pb-5 text-meta font-medium sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]'
          : 'flex flex-wrap items-end gap-4 rounded-md border border-border p-4'
      }
    >
      {activeTab ? <input type="hidden" name="tab" value={activeTab} /> : null}
      <label className="grid gap-1">
        Month (IST)
        <input
          type="month"
          aria-label="Month (IST)"
          name="period"
          defaultValue={filters.period}
          required
          className={`min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground ${admin ? 'w-full min-w-0' : ''}`}
        />
      </label>
      <label className="grid gap-1">
        Environment
        <select
          aria-label="Environment"
          name="environment"
          defaultValue={filters.environment}
          className={`min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground ${admin ? 'w-full min-w-0' : ''}`}
        >
          <option value="live">Live</option>
          <option value="test">Test — no bank earnings</option>
          <option value="simulated">Simulated — no money moved</option>
          <option value="legacy_unknown">Legacy / unverified</option>
        </select>
      </label>
      <label className="grid gap-1">
        Property
        <select
          aria-label="Property"
          name="propertyId"
          defaultValue={filters.propertyId}
          className={`min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground ${admin ? 'w-full min-w-0' : 'max-w-64'}`}
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || 'Untitled draft'}
            </option>
          ))}
          {filters.propertyId && !properties.some((p) => p.id === filters.propertyId) && (
            <option value={filters.propertyId}>Selected property</option>
          )}
        </select>
      </label>
      {admin && (
        <label className="grid gap-1">
          Owner ID (optional)
          <input
            aria-label="Owner ID (optional)"
            name="ownerId"
            defaultValue={filters.ownerId}
            className={`min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground ${admin ? 'w-full min-w-0' : ''}`}
          />
        </label>
      )}
      <button className="min-h-11 rounded-md bg-primary px-4 text-white">Apply filters</button>
    </form>
  );
}
function BookingLink({ row, admin, capabilities = [] }) {
  if (!row.orderId)
    return <p>Historical booking {row.reference} · No linked order was recorded.</p>;
  return row.bookingLinkAvailable && (!admin || capabilities.includes('admin.records.read')) ? (
    <Link href={`${admin ? '/admin' : '/partner'}/bookings/${row.orderId}`}>
      Booking {row.reference}
    </Link>
  ) : (
    <p>
      Booking {row.reference} ·{' '}
      {admin
        ? 'Booking record requires Records read access.'
        : 'Historical financial evidence retained; operational access belongs to the current owner.'}
    </p>
  );
}
function Destination({ value }) {
  return value ? (
    <p>
      Pinned destination v{value.version}: {value.masked} · {value.state}
    </p>
  ) : (
    <p>
      No destination version recorded. Current settings do not establish this payout’s destination.
    </p>
  );
}
function Pager({ data, noun }) {
  return (
    <Pagination
      page={data.filters.page}
      pageSize={30}
      total={data.count}
      pageSizes={null}
      label="Finance pagination"
      noun={noun}
    />
  );
}
export function Statement({
  data,
  admin = false,
  detail = false,
  capabilities = [],
  tab,
  params = {},
}) {
  const b = baseFor(admin),
    f = data.filters;
  const tabs = [
    { key: 'overview', label: 'Monthly summary' },
    { key: 'allocations', label: 'Allocations', count: data.count },
  ];
  const active = pickTab(tab, tabs);
  const Container = admin ? AdminPage : 'div';
  return (
    <Container
      className={
        admin
          ? 'space-y-6 text-meta [&>p]:max-w-prose [&_a]:min-h-11 [&_a]:items-center [&_a]:text-brand-700 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4'
          : 'space-y-6'
      }
    >
      {admin ? (
        <AdminPageHeader
          title={`${detail ? 'Statement' : 'Finance statements'} · ${f.period}`}
          description={`${f.environment} evidence · Month (IST) · INR`}
          backHref={detail ? `/admin/finance/statements?${query(f)}` : undefined}
          backLabel="Statements"
        />
      ) : (
        <header>
          <h1 className="text-h1">
            {detail ? 'Statement' : 'Finance statements'} · {f.period}
          </h1>
          <p className="font-semibold">
            {f.environment === 'live'
              ? 'Live evidence'
              : `${f.environment} evidence — excluded from live earnings`}
          </p>
        </header>
      )}
      {admin ? (
        <DetailTabs
          tabs={tabs}
          active={active}
          params={{ ...params, ...f }}
          basePath={detail ? `${b}/statements/${f.period}` : `${b}/statements`}
          wrap
        />
      ) : null}
      <Filters
        filters={f}
        activeTab={admin && active !== 'overview' ? active : undefined}
        admin={admin}
        properties={data.properties}
        action={admin ? '/admin/finance/statements' : '/partner/finance'}
      />
      {admin ? (
        <p className="text-ink-600">
          As of {adminDateTime(data.asOf)} · INR · {data.count} allocations
        </p>
      ) : (
        <>
          <p>{data.basis}</p>
          <p>
            As of {data.asOf} · INR · {data.count} allocations
          </p>
        </>
      )}
      {!admin && (
        <aside className="space-y-2 rounded-md border border-border p-4">
          <p>{data.settlementNotice}</p>
          <p>{data.attributionNotice}</p>
          <p>{data.adjustmentNotice}</p>
        </aside>
      )}
      {!admin || active === 'overview' ? (
        <>
          <dl
            className={
              admin
                ? 'grid gap-x-8 rounded-lg border border-border bg-card px-5 sm:grid-cols-2'
                : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {Object.entries(data.totals).map(([k, v]) => (
              <div
                key={k}
                className={
                  admin
                    ? 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-4 last:border-b-0'
                    : 'rounded-md border border-border p-4'
                }
              >
                <dt>{labels[k]}</dt>
                <dd className={admin ? 'font-semibold tabular text-ink-900' : 'text-h3'}>
                  {displayMoney(v)}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Live rent after completed refunds = reserved refunds + pending + eligible + held +
            recorded settled. Fees and deposits are not owner earnings. Quoted rent is counted once
            per contributing visit and is not proof of collection.
          </p>
          {admin ? (
            <details className="border-y border-border py-3">
              <summary className="min-h-11 content-center cursor-pointer font-semibold">
                Evidence basis and accounting notes
              </summary>
              <div className="mt-3 max-w-prose space-y-2 text-ink-600">
                <p>{data.basis}</p>
                <p>{data.settlementNotice}</p>
                <p>{data.attributionNotice}</p>
                <p>{data.adjustmentNotice}</p>
              </div>
            </details>
          ) : null}
        </>
      ) : null}
      <div className="flex flex-wrap gap-4">
        <Link href={`${b}/statements/${f.period}?${query(f)}`}>Open period statement</Link>
        <a href={`${b}/statements/${f.period}/download?${query(f)}`}>Download statement CSV</a>
      </div>
      {!admin || active === 'allocations' ? (
        <>
          <h2 className="text-h2">
            {admin ? 'Receipt allocations and adjustments' : 'Earning lines and adjustments'}
          </h2>
          {!data.count && (
            <p>No earning lines match this period. This is not a confirmation of a bank balance.</p>
          )}
          {admin ? (
            <section
              aria-label="Statement allocations"
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              {!data.count ? (
                <AdminEmpty
                  title="No allocations match"
                  description="Try another period, environment or property."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.items.slice((f.page - 1) * 30, f.page * 30).map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`${b}/allocations/${r.id}?from=${encodeURIComponent(`${b}/statements?${query(f)}`)}`}
                        className="grid gap-4 px-5 py-5 transition-colors hover:bg-ink-25 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] !no-underline"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">{r.title}</p>
                          <p className="mt-1 text-ink-600 font-normal">
                            {r.reference} · {r.component}
                          </p>
                          {!r.ownerId && (
                            <p className="mt-2 text-warning font-normal">
                              Owner attribution unresolved
                            </p>
                          )}
                        </div>
                        <dl className="grid grid-cols-2 gap-x-5 gap-y-2 font-normal text-ink-900">
                          {[
                            ['Verified receipts', r.collectedMinor],
                            ['Completed refunds', r.refundedMinor],
                            ['Accounting eligible', r.eligibleMinor],
                            ['Held', r.heldMinor],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-tiny text-ink-600">{label}</dt>
                              <dd className="font-semibold tabular">{displayMoney(value)}</dd>
                            </div>
                          ))}
                        </dl>
                        <span className="inline-flex items-center gap-1 self-start md:self-center">
                          View allocation <ArrowUpRight className="size-4" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <div className="space-y-4">
              {data.items.slice((f.page - 1) * 30, f.page * 30).map((r) => (
                <article key={r.id} className="space-y-2 rounded-md border border-border p-4">
                  <h3 className="text-h3">
                    <Link href={`${b}/allocations/${r.id}`}>
                      {r.title} · {r.component}
                    </Link>
                  </h3>
                  <BookingLink row={r} admin={admin} capabilities={capabilities} />
                  <p>
                    Receipts {displayMoney(r.collectedMinor)} · Refunds{' '}
                    {displayMoney(r.refundedMinor)} · Eligible {displayMoney(r.eligibleMinor)} ·
                    Held {displayMoney(r.heldMinor)}
                  </p>
                  {!r.ownerId && (
                    <p>Owner attribution unresolved — excluded from owner statements.</p>
                  )}
                  {r.payout && (
                    <Link href={`${b}/payouts/${r.payout.id}`}>Payout · {r.payout.status}</Link>
                  )}
                </article>
              ))}
            </div>
          )}
          <Pager data={data} noun="allocations" />
        </>
      ) : null}
    </Container>
  );
}
export function Allocation({
  row,
  admin = false,
  capabilities = [],
  listHref = '/admin/finance/statements',
}) {
  const b = baseFor(admin);
  const Container = admin ? AdminPage : 'div';
  return (
    <Container
      className={
        admin
          ? 'space-y-6 text-meta [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-brand-700 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&>a]:mr-5 [&>p]:max-w-prose'
          : 'space-y-5'
      }
    >
      {admin ? (
        <AdminPageHeader
          title="Allocation detail"
          description={`${row.title} · ${row.environment} · ${row.component}`}
          backHref={listHref}
          backLabel="Statements"
        />
      ) : (
        <h1 className="text-h1">Earning line</h1>
      )}
      {!admin && (
        <h2 className="text-h2">
          {row.title} · {row.component}
        </h2>
      )}
      <p>
        {admin
          ? `${row.environment} · ${row.attribution} owner attribution · ${row.bookingState}`
          : `${row.environment === 'live' ? 'Live booking' : 'Test or older booking'} · ${row.bookingState.replaceAll('_', ' ')}`}
        {!admin && (
          <span className="block mt-2">
            Commission and tax deductions are not applied yet. Payouts are not switched on yet.
          </span>
        )}
      </p>
      <BookingLink row={row} admin={admin} capabilities={capabilities} />
      <dl
        className={
          admin
            ? 'grid gap-x-8 rounded-lg border border-border bg-card px-5 sm:grid-cols-2 [&>div]:flex [&>div]:flex-wrap [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-3 [&>div]:border-b [&>div]:border-border [&>div]:py-4 [&_dd]:font-semibold [&_dd]:tabular'
            : 'grid gap-4 sm:grid-cols-2'
        }
      >
        {Object.entries(labels)
          .filter(([k]) => row[k] != null)
          .map(([k, label]) => (
            <div key={k}>
              <dt>{label}</dt>
              <dd>{displayMoney(row[k])}</dd>
            </div>
          ))}
      </dl>
      {row.reasons.map((reason) => (
        <p key={reason}>{reason}</p>
      ))}
      <h2 className="text-h2">Refund adjustments</h2>
      {!row.refunds.length && <p>No refund adjustments recorded.</p>}
      {row.refunds.map((r) => (
        <article className="rounded-md border p-4" key={r.id}>
          <p>
            {r.state} · Requested {displayMoney(r.expectedMinor)} · Completed{' '}
            {displayMoney(r.actualMinor)}
          </p>
          {admin && <Link href={`/admin/finance/refunds/${r.id}`}>Refund detail</Link>}
        </article>
      ))}
      {row.paymentOrderId && (
        <Link href={`/admin/finance/payments/${row.paymentOrderId}`}>Payment evidence</Link>
      )}
      {row.payout && (
        <>
          <Link href={`${b}/payouts/${row.payout.id}`}>Payout detail</Link>
          <Destination value={row.payout.destination} />
        </>
      )}
      <p>Live payout execution is unavailable. No transfer can be initiated here.</p>
    </Container>
  );
}
export function PayoutList({ data, admin = false }) {
  const b = baseFor(admin);
  const Container = admin ? AdminPage : 'div';
  return (
    <Container
      className={
        admin
          ? 'space-y-6 text-meta [&>p]:max-w-prose [&_a]:min-h-11 [&_a]:items-center [&_a]:text-brand-700 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4'
          : 'space-y-6'
      }
    >
      {admin ? (
        <AdminPageHeader
          title="Payout history"
          description="Recorded obligations and funding evidence. Live payout execution is unavailable."
        />
      ) : (
        <h1 className="text-h1">Payout history</h1>
      )}
      <Filters filters={data.filters} admin={admin} properties={data.properties} />
      <p>
        Obligations created in this IST month · {data.filters.environment} · {data.count} records
      </p>
      <p>
        Total verified funded amount: {displayMoney(data.totalMinor)}. Legacy quotes do not
        contribute to this total.
      </p>
      <p>Live payout execution is unavailable. Recorded status does not initiate a transfer.</p>
      {!data.count && <p>No payout records match these filters.</p>}
      {admin ? (
        <section
          aria-label="Payout records"
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          {!data.count ? (
            <AdminEmpty title="No payouts match" description="Try another period or environment." />
          ) : (
            <ul className="divide-y divide-border">
              {data.items.slice((data.filters.page - 1) * 30, data.filters.page * 30).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`${b}/payouts/${p.id}?from=${encodeURIComponent(`${b}/payouts?${query(data.filters)}`)}`}
                    className="grid gap-4 px-5 py-5 transition-colors hover:bg-ink-25 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] !no-underline"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{p.title}</p>
                      <p className="mt-1 text-ink-600 font-normal">
                        {p.environment} · Recorded {p.status}
                      </p>
                    </div>
                    <div className="text-ink-900">
                      <p className="text-tiny text-ink-600 font-normal">Verified funded amount</p>
                      <p className="font-semibold tabular">{displayMoney(p.amountMinor)}</p>
                      <div className="mt-2 text-tiny font-normal text-ink-600">
                        <Destination value={p.destination} />
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 self-start md:self-center">
                      View payout <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {' '}
          {data.items.slice((data.filters.page - 1) * 30, data.filters.page * 30).map((p) => (
            <article key={p.id} className="space-y-2 rounded-md border p-4">
              <h2 className="text-h3">
                <Link href={`${b}/payouts/${p.id}`}>
                  {p.title} · {p.status}
                </Link>
              </h2>
              <p>
                {displayMoney(p.amountMinor)} · {p.environment}
              </p>
              <Destination value={p.destination} />
            </article>
          ))}
        </>
      )}
      <Pager data={data} noun="payouts" />
    </Container>
  );
}
export function PayoutDetail({
  row,
  admin = false,
  capabilities = [],
  listHref = '/admin/finance/payouts',
}) {
  const b = baseFor(admin);
  const Container = admin ? AdminPage : 'div';
  if (admin)
    return (
      <AdminPage>
        <AdminPageHeader
          title={`Payout record · ${row.title}`}
          description={`${row.environment} · Recorded ${row.status.replaceAll('_', ' ')}`}
          backHref={listHref}
          backLabel="Payouts"
        />
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <SectionCard
              id="funding"
              title="Funding evidence"
              description="Recorded funding is separate from bank transfer verification"
            >
              <FieldGrid
                fields={[
                  { label: 'Verified funded amount', value: displayMoney(row.amountMinor) },
                  { label: 'Recorded status', value: row.status.replaceAll('_', ' ') },
                  { label: 'Environment', value: row.environment },
                  { label: 'Bank transfer verification', value: 'Unavailable' },
                  {
                    label: 'Provider reference',
                    value: row.utr || 'Not recorded',
                    mono: !!row.utr,
                  },
                  { label: 'Settlement time', value: earningsTime(row.settledAt) },
                ]}
              />
              <p className="mt-5 max-w-prose text-meta text-ink-600">
                Recorded settlement does not establish a verified bank transfer. Live payout
                execution is unavailable; this page cannot disburse or retry funds.
              </p>
              {row.recovery && <p className="mt-3 text-meta text-ink-700">{row.recovery}</p>}
            </SectionCard>
            <details className="border-y border-border py-3">
              <summary className="min-h-11 content-center cursor-pointer text-meta font-semibold">
                Recorded quote and deductions
              </summary>
              <p className="mt-3 max-w-prose text-meta text-ink-600">{row.deductionNotice}</p>
              <dl className="mt-4 divide-y divide-border text-meta">
                {Object.entries(row.legacyQuoteMinor).map(([k, v]) => (
                  <div className="flex flex-wrap justify-between gap-3 py-3" key={k}>
                    <dt>
                      {k.replace('Minor', '').replace('gstTcs', 'GST TCS').replace('tds', 'TDS')}
                    </dt>
                    <dd className="tabular">{displayMoney(v)} (quoted)</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
          <aside className="space-y-6 text-meta">
            <section className="border-t border-border pt-5">
              <h2 className="text-h4 font-semibold">Destination evidence</h2>
              <div className="mt-3 break-words text-ink-600">
                <Destination value={row.destination} />
              </div>
              {capabilities.includes('admin.clients.read') && (
                <Link
                  href={`/admin/clients/${row.ownerId}?tab=payout`}
                  className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
                >
                  Review payout destination
                </Link>
              )}
            </section>
            <section className="border-t border-border pt-5">
              <h2 className="text-h4 font-semibold">Related records</h2>
              <div className="mt-2 flex flex-col items-start gap-2 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline">
                <BookingLink row={row} admin capabilities={capabilities} />
                {row.allocationId && (
                  <Link href={`${b}/allocations/${row.allocationId}`}>Funding allocation</Link>
                )}
              </div>
            </section>
          </aside>
        </div>
      </AdminPage>
    );
  return (
    <Container
      className={
        admin
          ? 'space-y-6 text-meta [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-brand-700 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&>a]:mr-5 [&>p]:max-w-prose'
          : 'space-y-5'
      }
    >
      {admin ? (
        <AdminPageHeader
          title={`Payout detail · ${row.status}`}
          description={`${row.title} · ${row.environment}`}
          backHref={listHref}
          backLabel="Payouts"
        />
      ) : (
        <h1 className="text-h1">Payout detail · {row.status}</h1>
      )}
      {!admin && <h2 className="text-h2">{row.title}</h2>}
      <BookingLink row={row} admin={admin} capabilities={capabilities} />
      <p>
        Environment: {row.environment} · Verified funded amount: {displayMoney(row.amountMinor)}
      </p>
      <Destination value={row.destination} />
      <p>
        Bank verification is unavailable. Recorded settlement does not establish a verified bank
        transfer.
      </p>
      <p>Provider reference: {row.utr || 'Not recorded'}</p>
      <p>Settlement time: {earningsTime(row.settledAt)}</p>
      {row.allocationId && (
        <Link href={`${b}/allocations/${row.allocationId}`}>
          {admin ? 'Funding allocation' : 'Earning line'}
        </Link>
      )}
      <>
        <h2 className="text-h2">Recorded quote and deductions</h2>
        <p>{row.deductionNotice}</p>
        <dl>
          {Object.entries(row.legacyQuoteMinor).map(([k, v]) => (
            <div key={k}>
              <dt>{k.replace('Minor', '').replace('gstTcs', 'GST TCS').replace('tds', 'TDS')}</dt>
              <dd>{displayMoney(v)} (quoted)</dd>
            </div>
          ))}
        </dl>
      </>
      {row.recovery && <p>{row.recovery}</p>}
      <p>Live payout execution is unavailable; this page cannot disburse or retry funds.</p>
      {(!admin || capabilities.includes('admin.clients.read')) && (
        <Link
          href={admin ? `/admin/clients/${row.ownerId}?tab=payout` : '/partner/settings/payout'}
        >
          Review payout destination
        </Link>
      )}
    </Container>
  );
}

export function FinanceFilterError({ message, admin = false }) {
  const Container = admin ? AdminPage : 'div';
  return (
    <Container className="space-y-4">
      <h1 className="text-h1">Check the statement filters</h1>
      <p role="alert">{message}</p>
      <Link href={admin ? '/admin/finance/statements' : '/partner/earnings'}>Reset filters</Link>
      <form className="flex flex-wrap gap-3">
        <label className="grid gap-1">
          Month (IST)
          <input
            type="month"
            aria-label="Month (IST)"
            name="period"
            required
            className={`min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground ${admin ? 'w-full min-w-0' : ''}`}
          />
        </label>
        <label className="grid gap-1">
          Property ID
          <input
            aria-label="Property"
            name="propertyId"
            className={`min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground ${admin ? 'w-full min-w-0' : ''}`}
          />
        </label>
        <button className="min-h-11 rounded-md border px-4">Apply narrower filters</button>
      </form>
    </Container>
  );
}
