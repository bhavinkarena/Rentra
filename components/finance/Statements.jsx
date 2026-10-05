import {
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminEmpty,
} from '@/components/admin/AdminPrimitives';
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
function Filters({ filters, admin, properties = [], action }) {
  return (
    <form
      method="get"
      action={action}
      className="flex flex-wrap items-end gap-4 rounded-md border border-border p-4"
    >
      <label className="grid gap-1">
        Month (IST)
        <input
          type="month"
          aria-label="Month (IST)"
          name="period"
          defaultValue={filters.period}
          required
          className="min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
        />
      </label>
      <label className="grid gap-1">
        Environment
        <select
          aria-label="Environment"
          name="environment"
          defaultValue={filters.environment}
          className="min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
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
          className="min-h-11 max-w-64 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
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
            className="min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
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
export function Statement({ data, admin = false, detail = false, capabilities = [] }) {
  const b = baseFor(admin),
    f = data.filters;
  const Container = admin ? AdminPage : 'div';
  return (
    <Container className="space-y-6">
      {admin ? (
        <AdminPageHeader
          eyebrow="Finance · Statements"
          title={`${detail ? 'Statement' : 'Finance statements'} · ${f.period}`}
          description={`${f.environment} evidence · Month (IST) · INR`}
          backHref={detail ? '/admin/finance/statements' : undefined}
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
      <Filters
        filters={f}
        admin={admin}
        properties={data.properties}
        action={admin ? '/admin/finance/statements' : '/partner/finance'}
      />
      <p>{data.basis}</p>
      <p>
        As of {data.asOf} · INR · {data.count} allocations
      </p>
      <aside className="space-y-2 rounded-md border border-border p-4">
        <p>{data.settlementNotice}</p>
        <p>{data.attributionNotice}</p>
        <p>{data.adjustmentNotice}</p>
      </aside>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data.totals).map(([k, v]) => (
          <div key={k} className="rounded-md border border-border p-4">
            <dt>{labels[k]}</dt>
            <dd className="text-h3">{displayMoney(v)}</dd>
          </div>
        ))}
      </dl>
      <p>
        Live rent after completed refunds = reserved refunds + pending + eligible + held + recorded
        settled. Fees and deposits are not owner earnings. Quoted rent is counted once per
        contributing visit and is not proof of collection.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link href={`${b}/statements/${f.period}?${query(f)}`}>Open period statement</Link>
        <a href={`${b}/statements/${f.period}/download?${query(f)}`}>Download statement CSV</a>
      </div>
      <h2 className="text-h2">
        {admin ? 'Receipt allocations and adjustments' : 'Earning lines and adjustments'}
      </h2>
      {!data.count && (
        <p>No earning lines match this period. This is not a confirmation of a bank balance.</p>
      )}
      {admin ? (
        <AdminTable
          label="Statement allocations"
          columns={[
            'Property / booking',
            'Component',
            'Verified receipts',
            'Completed refunds',
            'Accounting eligible',
            'Held',
            'Action',
          ]}
          empty={
            !data.count ? (
              <AdminEmpty
                title="No allocations match"
                description="Try another period, environment or property."
              />
            ) : null
          }
        >
          {data.items.slice((f.page - 1) * 30, f.page * 30).map((r) => (
            <tr key={r.id}>
              <td>
                <strong className="block">{r.title}</strong>
                <span>{r.reference}</span>
                {!r.ownerId && <span className="block">Owner attribution unresolved</span>}
              </td>
              <td>{r.component}</td>
              {[r.collectedMinor, r.refundedMinor, r.eligibleMinor, r.heldMinor].map((v, i) => (
                <td className="tabular" key={i}>
                  {displayMoney(v)}
                </td>
              ))}
              <td>
                <Link
                  href={`${b}/allocations/${r.id}`}
                  className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
                >
                  View allocation
                  <span className="sr-only">
                    {' '}
                    · {r.reference} · {r.component}
                  </span>
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
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
                Receipts {displayMoney(r.collectedMinor)} · Refunds {displayMoney(r.refundedMinor)}{' '}
                · Eligible {displayMoney(r.eligibleMinor)} · Held {displayMoney(r.heldMinor)}
              </p>
              {!r.ownerId && <p>Owner attribution unresolved — excluded from owner statements.</p>}
              {r.payout && (
                <Link href={`${b}/payouts/${r.payout.id}`}>Payout · {r.payout.status}</Link>
              )}
            </article>
          ))}
        </div>
      )}
      <Pager data={data} noun="allocations" />
    </Container>
  );
}
export function Allocation({ row, admin = false, capabilities = [] }) {
  const b = baseFor(admin);
  const Container = admin ? AdminPage : 'div';
  return (
    <Container className="space-y-5">
      {admin ? (
        <AdminPageHeader
          eyebrow="Finance · Accounting evidence"
          title="Allocation detail"
          description={`${row.title} · ${row.environment} · ${row.component}`}
          backHref="/admin/finance/statements"
          backLabel="Statements"
        />
      ) : (
        <h1 className="text-h1">Earning line</h1>
      )}
      <h2 className="text-h2">
        {row.title} · {row.component}
      </h2>
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
      <dl className="grid gap-4 sm:grid-cols-2">
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
    <Container className="space-y-6">
      {admin ? (
        <AdminPageHeader
          eyebrow="Finance"
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
        <AdminTable
          label="Payout records"
          columns={[
            'Property',
            'Environment',
            'Funded amount',
            'Recorded status',
            'Destination evidence',
            'Action',
          ]}
          empty={
            !data.count ? (
              <AdminEmpty
                title="No payouts match"
                description="Try another period or environment."
              />
            ) : null
          }
        >
          {data.items.slice((data.filters.page - 1) * 30, data.filters.page * 30).map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.environment}</td>
              <td className="tabular">{displayMoney(p.amountMinor)}</td>
              <td>{p.status}</td>
              <td>
                <Destination value={p.destination} />
              </td>
              <td>
                <Link
                  className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
                  href={`${b}/payouts/${p.id}`}
                >
                  View payout<span className="sr-only"> · {p.title}</span>
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
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
export function PayoutDetail({ row, admin = false, capabilities = [] }) {
  const b = baseFor(admin);
  const Container = admin ? AdminPage : 'div';
  return (
    <Container className="space-y-5">
      {admin ? (
        <AdminPageHeader
          eyebrow="Finance · Payout evidence"
          title={`Payout detail · ${row.status}`}
          description={`${row.title} · ${row.environment}`}
          backHref="/admin/finance/payouts"
          backLabel="Payouts"
        />
      ) : (
        <h1 className="text-h1">Payout detail · {row.status}</h1>
      )}
      <h2 className="text-h2">{row.title}</h2>
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
      {row.recovery && <p>{row.recovery}</p>}
      <p>Live payout execution is unavailable; this page cannot disburse or retry funds.</p>
      {(!admin || capabilities.includes('admin.clients.read')) && (
        <Link href={admin ? `/admin/clients/${row.ownerId}` : '/partner/settings/payout'}>
          Review payout destination
        </Link>
      )}
    </Container>
  );
}

export function FinanceFilterError({ message, admin = false }) {
  return (
    <div className="space-y-4">
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
            className="min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
          />
        </label>
        <label className="grid gap-1">
          Property ID
          <input
            aria-label="Property"
            name="propertyId"
            className="min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
          />
        </label>
        <button className="min-h-11 rounded-md border px-4">Apply narrower filters</button>
      </form>
    </div>
  );
}
