'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import {
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminEmpty,
  AdminReadOnly,
  StatusBadge,
} from './AdminPrimitives';
import { adminDateTime as stamp } from '@/lib/domain/admin-display';
import { createAuditExport, retryAuditExport } from '@/lib/actions/audit';
const card = 'space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6';
const input = `${sharedFieldClass} mt-1`;
const button = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
const label = (d) =>
  ({
    audit_events: 'Redacted audit events',
    payment_orders: 'Payment-order summary',
    operation_receipts: 'Calendar operation receipts',
  })[d] || d;
export function AuditDirectory({ data }) {
  const router = useRouter();
  return (
    <AdminPage className="space-y-6">
      <AdminPageHeader title="Audit history" />
      <p>
        Search recorded actions. Contact details, free text and unrecognized payload fields are
        withheld.
      </p>
      <Link className="inline-flex min-h-11 items-center underline" href="/admin/audit/exports">
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
      <AdminTable
        label="Audit events"
        columns={['Action', 'Recorded (IST)', 'Actor', 'Target and correlation', 'Event']}
        empty={
          !data.items.length && (
            <AdminEmpty
              title="No matching events"
              description="Choose another action, actor or UTC date range."
            />
          )
        }
      >
        {data.items.map((e) => (
          <tr key={e.id}>
            <td className="max-w-xs break-words px-4 py-4">
              {e.action}
              {e.reason && <p>{e.reason}</p>}
            </td>
            <td className="px-4 py-4">{stamp(e.at)}</td>
            <td className="max-w-xs break-all px-4 py-4">
              {e.actor.type}
              <p>{e.actor.id || 'System'}</p>
            </td>
            <td className="max-w-xs break-all px-4 py-4">
              {e.target.type}
              <p>{e.target.id || 'Withheld or absent'}</p>
              <p>Correlation: {e.correlation || 'Not recorded'}</p>
            </td>
            <td className="px-4 py-4">
              <Link
                className="inline-flex min-h-11 items-center underline"
                href={`/admin/audit/events/${e.id}`}
              >
                View
                <span className="sr-only">
                  {' '}
                  {e.action} at {stamp(e.at)}
                </span>
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
      <Pagination
        page={data.page}
        pageSize={25}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Audit pages"
        noun="events"
      />
      {data.canExport ? (
        <ExportForm data={data} />
      ) : (
        <AdminReadOnly>Audit write access is required to create governed exports.</AdminReadOnly>
      )}
    </AdminPage>
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
    <AdminPage className="space-y-6">
      <Link href="/admin/audit" className="inline-flex min-h-11 items-center underline">
        Back to audit history
      </Link>
      <AdminPageHeader title="Audit event" />
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
    </AdminPage>
  );
}
export function ExportDirectory({ data }) {
  return (
    <AdminPage className="space-y-6">
      <AdminPageHeader title="My governed exports" />
      <Link className="inline-flex min-h-11 items-center underline" href="/admin/audit">
        Search audit history
      </Link>
      <p>
        Latest 25 export requests for your account. Every download rechecks your current access.
      </p>
      <AdminTable
        label="Governed exports"
        columns={['Dataset', 'Status', 'Requested (IST)', 'Failure', 'Export']}
        empty={
          !data.items.length && (
            <AdminEmpty
              title="No export requests"
              description="Authorized operators can create an export from audit history."
            />
          )
        }
      >
        {data.items.map((j) => (
          <tr key={j.id}>
            <td className="px-4 py-4">{label(j.dataset)}</td>
            <td className="px-4 py-4">
              <StatusBadge domain="export" state={j.state} />
            </td>
            <td className="px-4 py-4">{stamp(j.createdAt)}</td>
            <td className="px-4 py-4">{j.errorCode || 'None recorded'}</td>
            <td className="px-4 py-4">
              <Link
                className="inline-flex min-h-11 items-center underline"
                href={`/admin/audit/exports/${j.id}`}
              >
                View
                <span className="sr-only">
                  {' '}
                  {label(j.dataset)} requested {stamp(j.createdAt)}
                </span>
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
      {!data.canExport && (
        <AdminReadOnly>
          Export creation and retry require audit write access. Existing authorized copies remain
          inspectable.
        </AdminReadOnly>
      )}
    </AdminPage>
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
    <AdminPage className="space-y-6">
      <Link className="inline-flex min-h-11 items-center underline" href="/admin/audit/exports">
        Back to my exports
      </Link>
      <AdminPageHeader title={label(j.dataset)} />
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
              <a
                className="inline-flex min-h-11 items-center underline"
                href={`/admin/audit/exports/${j.id}/download`}
              >
                Download scoped JSON
              </a>
            </p>
          ) : (
            <p>This copy expired or was revoked. Create a new request.</p>
          )}
          <a
            className="inline-flex min-h-11 items-center underline"
            href={`/admin/audit/exports/${j.id}/receipt`}
          >
            Download export receipt
          </a>
        </section>
      )}
    </AdminPage>
  );
}
