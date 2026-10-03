'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import { createAuditExport, retryAuditExport } from '@/lib/actions/audit';
const card = 'space-y-4 rounded-lg border border-ink-200 bg-white p-4 sm:p-6';
const input = `${sharedFieldClass} mt-1`;
const button = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
const label = (d) =>
  ({
    audit_events: 'Redacted audit events',
    payment_orders: 'Payment-order summary',
    operation_receipts: 'Calendar operation receipts',
  })[d] || d;
const stamp = (v) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
export function AuditDirectory({ data }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Audit history</h1>
      <p>
        Search recorded actions. Contact details, free text and unrecognized payload fields are
        withheld.
      </p>
      <Link className="underline" href="/admin/audit/exports">
        My governed exports
      </Link>
      <form action="/admin/audit" className={card}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {['from', 'to'].map((k) => (
            <label key={k}>
              {k === 'from' ? 'From (UTC)' : 'Through (UTC)'}
              <input
                className={input}
                type="date"
                name={k}
                defaultValue={data.filters[k]}
                required
              />
            </label>
          ))}
          <label>
            Actor type
            <select
              aria-label="Actor type"
              className={input}
              name="actorType"
              defaultValue={data.filters.actorType || ''}
            >
              <option value="">Any actor</option>
              {['admin', 'client', 'customer', 'system', 'staff'].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          {['actorId', 'action', 'entity', 'target', 'correlation'].map((k) => (
            <label key={k}>
              {
                {
                  actorId: 'Actor UUID',
                  action: 'Exact action',
                  entity: 'Target type',
                  target: 'Target UUID',
                  correlation: 'Correlation UUID',
                }[k]
              }
              <input
                className={input}
                name={k}
                defaultValue={data.filters[k] || ''}
                maxLength={64}
              />
            </label>
          ))}
        </div>
        <p className="text-sm">Maximum 31 UTC dates. Results are newest first.</p>
        <button className={button}>Apply filters</button>
      </form>
      <p>
        {data.total} matching events · Page {data.page} of {data.pages} · Refreshed{' '}
        {stamp(data.refreshedAt)}
      </p>
      <button className={button} onClick={() => router.refresh()}>
        Refresh history
      </button>
      {data.items.length ? (
        <ul className="space-y-3">
          {data.items.map((e) => (
            <li key={e.id} className={card}>
              <Link className="font-semibold underline" href={`/admin/audit/events/${e.id}`}>
                {e.action}
              </Link>
              <p>
                {stamp(e.at)} · {e.actor.type}
              </p>
              <p className="break-all text-sm">
                Actor: {e.actor.id || 'System'}
                <br />
                Target: {e.target.type} · {e.target.id || 'No public identifier'}
                <br />
                Correlation: {e.correlation || 'Not recorded'}
              </p>
              {e.reason && <p>{e.reason}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No events match these filters.</p>
      )}
      <Pagination
        page={data.page}
        pageSize={25}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Audit pages"
        noun="events"
      />
      {data.canExport && <ExportForm data={data} />}
    </div>
  );
}
function ExportForm({ data }) {
  const [dataset, setDataset] = useState('audit_events'),
    [key, setKey] = useState(null),
    [result, setResult] = useState(null),
    [pending, start] = useTransition();
  const router = useRouter();
  function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      requestKey = key || crypto.randomUUID();
    setKey(requestKey);
    const filters =
      dataset === 'payment_orders'
        ? { from: data.filters.from, to: data.filters.to }
        : data.filters;
    start(async () => {
      const response = await createAuditExport({
        dataset,
        filters,
        limit: Number(f.get('limit')),
        requestKey,
        reason: f.get('reason'),
        confirmed: f.get('confirmed') === 'on',
        ...(dataset === 'payment_orders' ? { environment: f.get('environment') } : {}),
      });
      setResult(response);
      if (response.id) {
        setKey(null);
        router.push(`/admin/audit/exports/${response.id}`);
      }
    });
  }
  return (
    <section className={card}>
      <h2 className="text-h2">Create governed export</h2>
      <p>
        Uses the selected UTC dates and filters. Payment summaries use dates and one environment
        only. Maximum 2,000 rows and 5 MB; an oversized result fails without truncation.
      </p>
      <form onSubmit={submit} className="space-y-4" onChange={() => setKey(null)}>
        <label>
          Dataset
          <select
            aria-label="Dataset"
            className={input}
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
          >
            {data.datasets.map((d) => (
              <option key={d} value={d}>
                {label(d)}
              </option>
            ))}
          </select>
        </label>
        {dataset === 'payment_orders' && (
          <label>
            Payment environment
            <select aria-label="Payment environment" className={input} name="environment" required>
              <option value="test">Test</option>
              <option value="simulated">Simulation</option>
              <option value="live">Live</option>
            </select>
          </label>
        )}
        <label>
          Maximum rows
          <input
            className={input}
            type="number"
            name="limit"
            min={1}
            max={2000}
            defaultValue={1000}
            required
          />
        </label>
        <label>
          Export reason
          <textarea className={input} name="reason" minLength={20} maxLength={1000} required />
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="confirmed" required />I verified the dataset and scope. This
          copy expires after 24 hours.
        </label>
        <p className="text-sm">
          Sign in within fifteen minutes before export creation. Downloads remain restricted to your
          live account and dataset permissions.
        </p>
        {result?.error && <p role="alert">{result.error}</p>}
        <button className={button} disabled={pending}>
          {pending ? 'Queuing…' : 'Queue export'}
        </button>
      </form>
    </section>
  );
}
export function AuditDetail({ data }) {
  const e = data.event;
  return (
    <div className="space-y-6">
      <Link href="/admin/audit" className="underline">
        Back to audit history
      </Link>
      <h1 className="text-h1">Audit event</h1>
      <section className={card}>
        <h2 className="text-h2">{e.action}</h2>
        <p>{stamp(e.at)}</p>
        <p className="break-all">
          Event: {e.id}
          <br />
          Actor: {e.actor.type} · {e.actor.id || 'System'}
          <br />
          Target: {e.target.type} · {e.target.id || 'Withheld or absent'}
          <br />
          Correlation: {e.correlation || 'Not recorded for this event'}
        </p>
        <p>Reason: {e.reason || 'No reason recorded'}</p>
        <p className="text-sm">{e.redaction}</p>
      </section>
      <section className={card}>
        <h2 className="text-h2">Safe before and after differences</h2>
        {e.changes.length ? (
          <ul className="space-y-3">
            {e.changes.map((c) => (
              <li key={c.field} className="break-all">
                <strong>{c.field}</strong>
                <p>Before: {JSON.stringify(c.before)}</p>
                <p>After: {JSON.stringify(c.after)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No changed allowlisted fields were recorded. Omitted fields are not evidence of no
            change.
          </p>
        )}
      </section>
      {data.operationReceipt && (
        <section className={card}>
          <h2 className="text-h2">Committed operation receipt</h2>
          <p>{data.operationReceipt.semantics}</p>
          <p>
            {data.operationReceipt.countsRecorded
              ? `Attempted: ${data.operationReceipt.scope.attempted} · Added: ${data.operationReceipt.scope.added} · Skipped existing: ${data.operationReceipt.scope.skipped}`
              : 'This historical event did not record result counts.'}
          </p>
          <pre className="whitespace-pre-wrap break-all text-sm">
            {JSON.stringify(data.operationReceipt.scope, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
export function ExportDirectory({ data }) {
  return (
    <div className="space-y-6">
      <h1 className="text-h1">My governed exports</h1>
      <Link className="underline" href="/admin/audit">
        Search history and create an export
      </Link>
      <p>
        Latest 25 export requests for your account. Every download rechecks your current access.
      </p>
      {data.items.length ? (
        <ul className="space-y-3">
          {data.items.map((j) => (
            <li key={j.id} className={card}>
              <Link className="underline font-semibold" href={`/admin/audit/exports/${j.id}`}>
                {label(j.dataset)}
              </Link>
              <p>
                {j.state} · {stamp(j.createdAt)}
              </p>
              {j.errorCode && <p>{j.errorCode}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No export requests.</p>
      )}
    </div>
  );
}
export function ExportDetail({ data }) {
  const j = data.job,
    router = useRouter();
  const [result, setResult] = useState(null),
    [pending, start] = useTransition();
  function retry(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await retryAuditExport(j.id, {
        version: j.version,
        reason: f.get('reason'),
        confirmed: f.get('confirmed') === 'on',
      });
      setResult(r);
      if (!r.error) router.refresh();
    });
  }
  return (
    <div className="space-y-6">
      <Link className="underline" href="/admin/audit/exports">
        Back to my exports
      </Link>
      <h1 className="text-h1">{label(j.dataset)}</h1>
      <section className={card}>
        <p className="break-all">Request: {j.id}</p>
        <p>
          {j.state} · Version {j.version} · Attempts {j.attempts}
        </p>
        <p>
          {j.scope.filters.from} through {j.scope.filters.to} UTC · Maximum {j.scope.limit} rows
          {j.scope.environment ? ` · ${j.scope.environment}` : ''}
        </p>
        <pre className="whitespace-pre-wrap break-all text-sm">
          {JSON.stringify(j.scope.filters, null, 2)}
        </pre>
        {j.errorCode && (
          <p role="alert">
            Export failed: {j.errorCode}. Narrow oversized scopes through a new request.
          </p>
        )}
        <button className={button} onClick={() => router.refresh()}>
          Refresh status
        </button>
      </section>
      {j.state === 'failed' && data.canExport && (
        <form onSubmit={retry} className={card}>
          <h2 className="text-h2">Retry export</h2>
          <label>
            Retry reason
            <textarea className={input} name="reason" minLength={20} maxLength={1000} required />
          </label>
          <label className="flex gap-2">
            <input type="checkbox" name="confirmed" required />I reviewed this scope and failure.
          </label>
          {result?.error && <p role="alert">{result.error}</p>}
          <button className={button} disabled={pending}>
            Retry failed export
          </button>
        </form>
      )}
      {j.receipt && (
        <section className={card}>
          <h2 className="text-h2">Export receipt</h2>
          <p>
            {j.receipt.rowCount} rows · {j.receipt.bytes} bytes · Expires{' '}
            {stamp(j.receipt.expiresAt)}
          </p>
          <p>{j.receipt.semantics}</p>
          <ul>
            {j.receipt.exclusions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          {j.downloadAvailable ? (
            <p>
              <a className="underline" href={`/admin/audit/exports/${j.id}/download`}>
                Download scoped JSON
              </a>
            </p>
          ) : (
            <p>This copy expired or was revoked. Create a new request.</p>
          )}
          <a className="underline" href={`/admin/audit/exports/${j.id}/receipt`}>
            Download export receipt
          </a>
        </section>
      )}
    </div>
  );
}
