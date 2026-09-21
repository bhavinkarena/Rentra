import Link from 'next/link';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';

export const metadata = { title: 'Operations and measurement', robots: { index: false, follow: false, nocache: true } };

export default async function OperationsPage() {
  await requireAdmin();
  const data = await adminApi.operations();
  return <div className="mx-auto max-w-(--container-page) space-y-8 px-4 py-8 sm:px-6">
    <header><h1 className="text-h1">Operations and measurement</h1>
      <p className="mt-3 text-meta">Updated {data.sampledAt}. Refresh to check again. Alerts are visible here; no external paging is configured.</p>
      <p className="mt-2 text-meta">Razorpay Test: {data.gateway.enabled ? 'enabled' : 'disabled'}; credentials {data.gateway.credentialsReady ? 'configured' : 'not ready'}. Live collection remains unavailable.</p>
      <nav className="mt-3 flex flex-wrap gap-5" aria-label="Operations tools">{[['payments','Payments'],['bookings','Bookings'],['notifications','Delivery'],['support','Support']].map(([path,label]) => <Link key={path} href={`/admin/${path}`} className="underline">{label}</Link>)}</nav>
    </header>
    <section><h2 className="text-h2">Needs attention</h2>
      {data.alerts.length ? <ul className="mt-3 list-inside list-disc">{data.alerts.map(item => <li key={item.code}>{item.code.replaceAll('_',' ')}: {item.count}</li>)}</ul> : <p>No configured alert thresholds are currently exceeded.</p>}
      <p className="mt-3 text-meta">A missing heartbeat is unknown health, never a passing check. Workers become stale after two minutes. Payment and refund queues alert after 15 minutes, webhooks after five, overdue holds after two, and support after 24 hours. Daily action error counters alert at ten.</p>
      <ul className="mt-3">{data.health.map(row => <li key={row.service}>{row.service}: {row.healthy && !row.stale ? 'last tick passed' : 'needs attention'}; last success {row.last_success_at ? new Date(row.last_success_at).toISOString() : 'never recorded'}</li>)}</ul>
    </section>
    <section><h2 className="text-h2">Durable journey records · last 30 days</h2>
      <ul className="mt-3">{Object.entries(data.funnel).map(([key,value]) => <li key={key}>{key.replaceAll('_',' ')}: {value}</li>)}</ul>
      <p className="mt-3 text-meta">Counts are persisted records, not unique people or conversion rates. Quotes may include anonymous requests. Test confirmations are deduplicated lifecycle facts.</p>
    </section>
    <section><h2 className="text-h2">Payment namespaces · all time · INR minor units</h2>
      <p className="mt-3 text-meta">Intent is payment-order value, not booking revenue. Test captures and refunds move no bank money. Schema mode “real” alone does not establish live funds.</p>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Payment totals, scroll horizontally for all columns"><table className="w-full text-left text-meta"><caption className="sr-only">Payment intent, verified capture and refunds by provider, environment and schema mode</caption>
        <thead><tr>{['Provider','Environment','Mode','Intent','Captured','Refunded'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{data.money.map(row => <tr key={`${row.provider}/${row.environment}/${row.mode}`}>{[row.provider,row.environment,row.mode,row.intended_minor,row.captured_minor,row.refunded_minor].map((value,index) => <td key={index} className="p-2">{value}</td>)}</tr>)}</tbody>
      </table></div>
      {!data.money.length && <p>No payment orders recorded.</p>}
      <p className="mt-3 text-meta">Verified eligible live allocations: captured {data.live.captured_minor}; refunded {data.live.refunded_minor}; net fees {data.live.net_fee_minor}; payout reserves {data.live.payout_reserved_minor}. These use the existing live-only accounting view; they are not a bank settlement statement.</p>
    </section>
    <section><h2 className="text-h2">Optional aggregate events · last 30 UTC days</h2>
      <p className="mt-3 text-meta">Collection is {data.measurementEnabled ? 'enabled' : 'disabled'}. Browser signals are untrusted and may be blocked, duplicated or missing. Server counts measure action outcomes, including retries. No per-person tracking or new/returning classification is collected. Financial outcomes come from the ledger above.</p>
      <ul className="mt-3 space-y-2">{data.measurements.map(row => <li key={`${row.event}/${row.source}/${row.device}/${row.visits}`}>{row.event.replaceAll('_',' ')} · {row.source} · {row.device} · {row.visits} visits: {row.count}</li>)}</ul>
      {!data.measurements.length && <p className="mt-3">No aggregate events in this window.</p>}
    </section>
  </div>;
}
