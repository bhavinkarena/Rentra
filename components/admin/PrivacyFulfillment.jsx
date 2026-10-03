'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import { privacyCommand } from '@/lib/actions/privacy';
const card = 'space-y-4 rounded-lg border border-ink-200 bg-white p-4 sm:p-6';
const input = `${sharedFieldClass} mt-1`;
const button = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
function Counts({ data }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm text-ink-600">{k.replaceAll('_', ' ')}</dt>
          <dd className="font-semibold">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function PrivacyDirectory({ data }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Customer privacy requests</h1>
      <p>Verify authority, approve a scoped operation, and track its actual outcome.</p>
      <form action="/admin/privacy" className="flex flex-wrap items-end gap-3">
        <label>
          Status
          <select className={input} name="state" defaultValue={data.state}>
            {['all', 'open', 'in_review', 'closed'].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <button className={button}>Apply filters</button>
      </form>
      <p>
        {data.total} matching requests · Page {data.page} of {data.pages}
      </p>
      <button className={button} onClick={() => router.refresh()}>
        Refresh status
      </button>
      {data.items.length ? (
        <ul className="space-y-3">
          {data.items.map((r) => (
            <li key={r.id} className={card}>
              <Link className="font-semibold underline" href={`/admin/privacy/${r.id}`}>
                {r.kind === 'access' ? 'Account data copy' : 'Account closure'}
              </Link>
              <p className="break-all text-sm">{r.id}</p>
              <p>
                {r.state.replaceAll('_', ' ')} · {r.job_state || 'No fulfillment job'}
                {r.error_code ? ` · ${r.error_code}` : ''}
              </p>
              <p className="text-sm">
                {new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No matching privacy requests.</p>
      )}
      <Pagination
        page={data.page}
        pageSize={20}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Privacy queue pages"
        noun="requests"
      />
    </div>
  );
}
function Commands({ data }) {
  const [result, setResult] = useState(null),
    [preview, setPreview] = useState(null),
    [pending, start] = useTransition();
  const r = data.request;
  function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      command = e.nativeEvent.submitter?.value || 'review';
    start(async () => {
      const response = await privacyCommand(r.id, {
        command,
        version: r.version,
        reason: f.get('reason'),
        confirmed: f.get('confirmed') === 'on',
        ...(command === 'review'
          ? {
              authority: f.get('authority'),
              identityReference: f.get('identityReference'),
              deliveryReference: f.get('deliveryReference'),
              retentionAccepted: f.get('retentionAccepted') === 'on',
            }
          : {}),
        ...(command === 'queue' ? { previewToken: preview?.previewToken } : {}),
      });
      setResult(response);
      if (command === 'preview') setPreview(response.previewToken ? response : null);
      else setPreview(null);
    });
  }
  return (
    <section className={card}>
      <h2 className="text-h3">Review and approval</h2>
      <p>
        Commands need a sign-in within 15 minutes. Record references to verified evidence; keep raw
        identity documents and contact details out of this form.
      </p>
      <form onSubmit={submit} className="space-y-4">
        {!data.job && (
          <fieldset className="space-y-4">
            <legend className="font-semibold">Identity and receipt delivery</legend>
            <label className="block">
              Requester authority
              <select
                className={input}
                name="authority"
                defaultValue={r.review?.authority || 'self'}
              >
                <option value="self">Account holder</option>
                <option value="representative">Verified representative</option>
              </select>
            </label>
            <label className="block">
              Identity / authority review reference
              <input
                className={input}
                name="identityReference"
                minLength={8}
                maxLength={200}
                defaultValue={r.review?.identityReference || ''}
              />
            </label>
            <label className="block">
              Verified receipt-delivery reference
              <input
                className={input}
                name="deliveryReference"
                minLength={8}
                maxLength={200}
                defaultValue={r.review?.deliveryReference || ''}
              />
            </label>
            <p className="text-sm">
              Arrange verified receipt delivery before closure signs the customer out. Download the
              final receipt for the agreed support handoff; this screen does not send it.
            </p>
            {r.kind === 'deletion' && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="retentionAccepted"
                  defaultChecked={r.review?.retentionAccepted}
                />
                Approve partial live-profile anonymization, the retained evidence below, and
                separate follow-up for historical PII, KYC, tokens and backups.
              </label>
            )}
          </fieldset>
        )}
        <label className="block">
          Reason
          <textarea name="reason" className={input} minLength={20} maxLength={1000} required />
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="confirmed" required />I verified the scope and consequences
          of this command.
        </label>
        <div className="flex flex-wrap gap-3">
          {!data.job && (
            <>
              <button className={button} disabled={pending} value="review">
                Record review
              </button>
              {r.review && (
                <button className={button} disabled={pending} value="preview">
                  Preview fulfillment
                </button>
              )}
            </>
          )}
          {preview && !data.job && (
            <button className={button} disabled={pending} value="queue">
              Approve and queue
            </button>
          )}
          {data.job?.state === 'failed' && (
            <button className={button} disabled={pending} value="retry">
              Retry failed stage
            </button>
          )}
        </div>
      </form>
      {result?.error && <p role="alert">{result.error}</p>}
      {result?.ok && !result.previewToken && (
        <p role="status">Command recorded. Refresh status to follow the worker.</p>
      )}
      {preview && (
        <div role="status" className="space-y-3">
          <p className="font-semibold">Preview ready · {preview.policy}</p>
          <Counts data={preview.inventory} />
          <p>
            {r.kind === 'deletion'
              ? 'Approval blocks account access, revokes sessions and existing exports, and stops marketing. Historical financial and case evidence remains.'
              : 'The worker prepares an encrypted scoped copy, available for 24 hours. Excluded files need separate review.'}
          </p>
        </div>
      )}
    </section>
  );
}
export function PrivacyDetail({ data }) {
  const router = useRouter(),
    r = data.request;
  const live =
    data.job?.state === 'completed' &&
    r.kind === 'access' &&
    new Date(data.job.expiresAt) > new Date();
  return (
    <div className="space-y-6">
      <Link href="/admin/privacy" className="underline">
        Back to privacy queue
      </Link>
      <h1 className="text-h1">{r.kind === 'access' ? 'Account data copy' : 'Account closure'}</h1>
      <p className="break-all">Reference: {r.id}</p>
      <p>
        {r.state.replaceAll('_', ' ')} · Version {r.version} · Policy {data.policy}
      </p>
      <button className={button} onClick={() => router.refresh()}>
        Refresh status
      </button>
      <section className={card}>
        <h2 className="text-h3">Customer and scope</h2>
        <p className="break-all">
          {data.customer.name || 'Removed profile'} · {data.customer.email || 'No live email'} ·{' '}
          {data.customer.phone || 'No live phone'}
        </p>
        <Link className="underline" href={`/admin/customers/${data.customer.id}`}>
          Customer record
        </Link>
        <Counts data={data.inventory} />
      </section>
      <section className={card}>
        <h2 className="text-h3">Retention and identifying fields</h2>
        <p>
          {r.kind === 'deletion'
            ? 'This operation is partial anonymization. Historical personal information can remain.'
            : 'Access exports copy authorized information and do not delete records.'}{' '}
          The named operator must review due records and legal holds separately.
        </p>
        {data.retained.map((c) => (
          <div key={c.class} className="space-y-1">
            <h3 className="font-semibold">{c.class}</h3>
            <p>{c.reason}</p>
            <p className="text-sm">{c.schedule}</p>
            <p className="text-sm">{c.identifyingFields}</p>
          </div>
        ))}
      </section>
      {data.job && (
        <section className={card}>
          <h2 className="text-h3">Fulfillment progress</h2>
          <p>
            {data.job.state} · Checkpoint {data.job.stage} · {data.job.attempts} stage attempts
          </p>
          {data.job.errorCode && (
            <p role="alert">
              Failed stage: {data.job.errorCode}. Earlier committed stages remain completed; retry
              continues from this checkpoint.
            </p>
          )}
          <ul className="space-y-2">
            {data.job.results.map((s) => (
              <li key={s.stage}>
                {s.stage}: {s.outcome.replaceAll('_', ' ')}
                {s.favourites !== undefined && (
                  <p className="text-sm">
                    Removed favourites: {s.favourites} · Locally disabled payment methods:{' '}
                    {s.disabledPaymentMethods}. Provider erasure remains outstanding.
                  </p>
                )}
                {s.removedFields && (
                  <p className="text-sm">
                    Removed live fields: {s.removedFields.join(', ')}. Retained identifier:{' '}
                    {s.retainedIdentifier}.
                  </p>
                )}
                {s.counts && <Counts data={s.counts} />}
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.canWrite && r.state !== 'closed' ? (
        <Commands key={r.id} data={data} />
      ) : (
        !data.canWrite && (
          <p>Read-only privacy access. A privacy writer must approve or retry jobs.</p>
        )
      )}
      {r.receipt && (
        <section className={card}>
          <h2 className="text-h3">Outcome receipt</h2>
          <p>{r.receipt.outcome.replaceAll('_', ' ')}</p>
          <p>{r.receipt.limitations}</p>
          <ul>
            {r.receipt.outstanding.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {r.receipt.retentionReviewDueAt && (
            <p>
              Retention follow-up due:{' '}
              {new Date(r.receipt.retentionReviewDueAt).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
              })}
            </p>
          )}
          <a
            className="inline-flex min-h-11 items-center underline"
            href={`/admin/privacy/${r.id}/receipt`}
          >
            Download outcome receipt
          </a>
          {r.kind === 'access' &&
            (live ? (
              <>
                <p>
                  Data copy expires:{' '}
                  {new Date(data.job.expiresAt).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}
                </p>
                <a
                  className="inline-flex min-h-11 items-center underline"
                  href={`/admin/privacy/${r.id}/export`}
                >
                  Download scoped data copy
                </a>
              </>
            ) : (
              <p>Data copy expired or was revoked. A new access request is required.</p>
            ))}
        </section>
      )}
    </div>
  );
}
