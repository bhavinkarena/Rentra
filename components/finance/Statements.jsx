import Link from 'next/link';

export function money(value) {
  const minor = BigInt(value ?? 0),
    sign = minor < 0n ? '-' : '',
    n = minor < 0n ? -minor : minor;
  return `${sign}₹${(n / 100n).toLocaleString('en-IN')}.${String(n % 100n).padStart(2, '0')}`;
}
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
function Navigation({ admin }) {
  const b = baseFor(admin);
  return (
    <nav aria-label="Finance pages" className="flex flex-wrap gap-4">
      <Link href={admin ? `${b}/statements` : '/partner/finance'}>Statements</Link>
      <Link href={`${b}/payouts`}>Payout history</Link>
      {!admin && <Link href="/partner/settings/payout">Payout destination</Link>}
    </nav>
  );
}
function Filters({ filters, admin, properties = [], action }) {
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-4 rounded border border-border p-4"
    >
      <label className="grid gap-1">
        UTC month
        <input
          type="month"
          aria-label="UTC month"
          name="period"
          defaultValue={filters.period}
          required
          className="min-h-11 rounded border p-2"
        />
      </label>
      <label className="grid gap-1">
        Environment
        <select
          aria-label="Environment"
          name="environment"
          defaultValue={filters.environment}
          className="min-h-11 rounded border p-2"
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
          className="min-h-11 max-w-64 rounded border p-2"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
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
            className="min-h-11 rounded border p-2"
          />
        </label>
      )}
      <button className="min-h-11 rounded bg-primary px-4 text-white">Apply filters</button>
    </form>
  );
}
function BookingLink({ row, admin }) {
  if (!row.orderId)
    return <p>Historical booking {row.reference} · No linked order was recorded.</p>;
  return row.bookingLinkAvailable ? (
    <Link href={`${admin ? '/admin' : '/partner'}/bookings/${row.orderId}`}>
      Booking {row.reference}
    </Link>
  ) : (
    <p>
      Booking {row.reference} · Historical financial evidence retained; operational access belongs
      to the current owner.
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
function Pager({ data }) {
  const page = data.filters.page,
    total = Math.ceil(data.count / 30);
  return (
    total > 1 && (
      <nav aria-label="Finance pagination" className="flex gap-4">
        {page > 1 && <Link href={`?${query({ ...data.filters, page: page - 1 })}`}>Previous</Link>}
        <span>
          Page {page} of {total}
        </span>
        {page < total && <Link href={`?${query({ ...data.filters, page: page + 1 })}`}>Next</Link>}
      </nav>
    )
  );
}
export function Statement({ data, admin = false, detail = false }) {
  const b = baseFor(admin),
    f = data.filters;
  return (
    <div className="space-y-6">
      <Navigation admin={admin} />
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
      <aside className="space-y-2 rounded border border-border p-4">
        <p>{data.settlementNotice}</p>
        <p>{data.attributionNotice}</p>
        <p>{data.adjustmentNotice}</p>
      </aside>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data.totals).map(([k, v]) => (
          <div key={k} className="rounded border border-border p-4">
            <dt>{labels[k]}</dt>
            <dd className="text-h3">{money(v)}</dd>
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
      <h2 className="text-h2">Receipt allocations and adjustments</h2>
      {!data.count && (
        <p>
          No allocations match this period and scope. This is not a confirmation of a bank balance.
        </p>
      )}
      <div className="space-y-4">
        {data.items.slice((f.page - 1) * 30, f.page * 30).map((r) => (
          <article key={r.id} className="space-y-2 rounded border border-border p-4">
            <h3 className="text-h3">
              <Link href={`${b}/allocations/${r.id}`}>
                {r.title} · {r.component}
              </Link>
            </h3>
            <BookingLink row={r} admin={admin} />
            <p>
              Receipts {money(r.collectedMinor)} · Refunds {money(r.refundedMinor)} · Eligible{' '}
              {money(r.eligibleMinor)} · Held {money(r.heldMinor)}
            </p>
            {!r.ownerId && <p>Owner attribution unresolved — excluded from owner statements.</p>}
            {r.payout && (
              <Link href={`${b}/payouts/${r.payout.id}`}>Payout · {r.payout.status}</Link>
            )}
          </article>
        ))}
      </div>
      <Pager data={data} />
    </div>
  );
}
export function Allocation({ row, admin = false }) {
  const b = baseFor(admin);
  return (
    <div className="space-y-5">
      <Navigation admin={admin} />
      <h1 className="text-h1">Allocation detail</h1>
      <h2 className="text-h2">
        {row.title} · {row.component}
      </h2>
      <p>
        {row.environment} · {row.attribution} owner attribution · {row.bookingState}
      </p>
      <BookingLink row={row} admin={admin} />
      <dl className="grid gap-4 sm:grid-cols-2">
        {Object.entries(labels)
          .filter(([k]) => row[k] != null)
          .map(([k, label]) => (
            <div key={k}>
              <dt>{label}</dt>
              <dd>{money(row[k])}</dd>
            </div>
          ))}
      </dl>
      {row.reasons.map((reason) => (
        <p key={reason}>{reason}</p>
      ))}
      <h2 className="text-h2">Refund adjustments</h2>
      {!row.refunds.length && <p>No refund adjustments recorded.</p>}
      {row.refunds.map((r) => (
        <article className="rounded border p-4" key={r.id}>
          <p>
            {r.state} · Requested {money(r.expectedMinor)} · Completed {money(r.actualMinor)}
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
    </div>
  );
}
export function PayoutList({ data, admin = false }) {
  const b = baseFor(admin);
  return (
    <div className="space-y-6">
      <Navigation admin={admin} />
      <h1 className="text-h1">Payout history</h1>
      <Filters filters={data.filters} admin={admin} properties={data.properties} />
      <p>
        Obligations created in this UTC month · {data.filters.environment} · {data.count} records
      </p>
      <p>
        Total verified funded amount: {money(data.totalMinor)}. Legacy quotes do not contribute to
        this total.
      </p>
      <p>Live payout execution is unavailable. Recorded status does not initiate a transfer.</p>
      {!data.count && <p>No payout records match these filters.</p>}
      {data.items.slice((data.filters.page - 1) * 30, data.filters.page * 30).map((p) => (
        <article key={p.id} className="space-y-2 rounded border p-4">
          <h2 className="text-h3">
            <Link href={`${b}/payouts/${p.id}`}>
              {p.title} · {p.status}
            </Link>
          </h2>
          <p>
            {money(p.amountMinor)} · {p.environment}
          </p>
          <Destination value={p.destination} />
        </article>
      ))}
      <Pager data={data} />
    </div>
  );
}
export function PayoutDetail({ row, admin = false }) {
  const b = baseFor(admin);
  return (
    <div className="space-y-5">
      <Navigation admin={admin} />
      <h1 className="text-h1">Payout detail · {row.status}</h1>
      <h2 className="text-h2">{row.title}</h2>
      <BookingLink row={row} admin={admin} />
      <p>
        Environment: {row.environment} · Verified funded amount: {money(row.amountMinor)}
      </p>
      <Destination value={row.destination} />
      <p>Provider reference: {row.utr || 'Not recorded'}</p>
      <p>Settlement time: {row.settledAt || 'Not recorded'}</p>
      {row.allocationId && (
        <Link href={`${b}/allocations/${row.allocationId}`}>Funding allocation</Link>
      )}
      <h2 className="text-h2">Recorded quote and deductions</h2>
      <p>{row.deductionNotice}</p>
      <dl>
        {Object.entries(row.legacyQuote).map(([k, v]) => (
          <div key={k}>
            <dt>{k.replace('Rupees', '').replace('gstTcs', 'GST TCS').replace('tds', 'TDS')}</dt>
            <dd>₹{v} (quoted)</dd>
          </div>
        ))}
      </dl>
      {row.recovery && <p>{row.recovery}</p>}
      <p>Live payout execution is unavailable; this page cannot disburse or retry funds.</p>
      <Link href={admin ? `/admin/clients/${row.ownerId}` : '/partner/settings/payout'}>
        Review payout destination
      </Link>
    </div>
  );
}

export function FinanceFilterError({ message, admin = false }) {
  return (
    <div className="space-y-4">
      <h1 className="text-h1">Check the statement filters</h1>
      <p role="alert">{message}</p>
      <Link href={admin ? '/admin/finance/statements' : '/partner/finance'}>Reset filters</Link>
      <form className="flex flex-wrap gap-3">
        <label className="grid gap-1">
          UTC month
          <input
            type="month"
            aria-label="UTC month"
            name="period"
            required
            className="min-h-11 rounded border p-2"
          />
        </label>
        <label className="grid gap-1">
          Property ID
          <input aria-label="Property" name="propertyId" className="min-h-11 rounded border p-2" />
        </label>
        <button className="min-h-11 rounded border px-4">Apply narrower filters</button>
      </form>
    </div>
  );
}
