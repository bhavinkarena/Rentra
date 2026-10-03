'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import { operatorCommand, enrollOperator } from '@/lib/actions/operators';
const input = `${sharedFieldClass} mt-1`;
const button = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
const card = 'space-y-4 rounded-lg border border-ink-200 bg-white p-4 sm:p-6';
function Grants({ options, initial = [], full = false }) {
  const [all, setAll] = useState(full);
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold">Capabilities</legend>
      <label className="flex gap-2">
        <input
          type="checkbox"
          name="full"
          checked={all}
          onChange={(e) => setAll(e.target.checked)}
        />
        Full Super Admin access
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((c) => (
          <label key={c} className="flex items-start gap-2 break-all">
            <input
              type="checkbox"
              name="capability"
              value={c}
              defaultChecked={initial.includes(c)}
              disabled={all}
            />
            {c}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function CommandForm({ data, create = false }) {
  const router = useRouter(),
    [pending, start] = useTransition(),
    [result, setResult] = useState(null);
  const o = data.operator;
  function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      command = e.nativeEvent.submitter?.value || 'create';
    setResult(null);
    start(async () => {
      const r = await operatorCommand(o?.id, {
        command,
        version: o?.version,
        reason: f.get('reason'),
        confirmed: f.get('confirmed') === 'on',
        ...(create ? { email: f.get('email'), name: f.get('name') } : {}),
        ...(['create', 'access'].includes(command)
          ? {
              permissions: f.get('full') === 'on' ? null : f.getAll('capability'),
              active: f.get('active') === 'on',
            }
          : {}),
      });
      setResult(r);
      if (r.ok && !r.enrollmentToken) router.refresh();
    });
  }
  return (
    <form onSubmit={submit} className={card}>
      <h2 className="text-xl font-semibold">{create ? 'Create operator' : 'Manage access'}</h2>
      <p>
        Changes require sign-in within 15 minutes. Access and factor changes end this operator’s
        sessions. Recovery replaces their password and factor after they complete enrollment.
      </p>
      {create && (
        <>
          <label className="block">
            Name
            <input className={input} name="name" required maxLength={160} />
          </label>
          <label className="block">
            Email
            <input className={input} name="email" type="email" required maxLength={254} />
          </label>
        </>
      )}
      {!create && (
        <label className="flex gap-2">
          <input key={o.version} type="checkbox" name="active" defaultChecked={o.active} />
          Active
        </label>
      )}
      <Grants
        key={o?.version}
        options={data.capabilityOptions}
        initial={o?.capabilities}
        full={o?.fullAccess}
      />
      <label className="block">
        Reason
        <textarea className={input} name="reason" required minLength={8} maxLength={1000} />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" name="confirmed" required />I reviewed the access and session impact.
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          className={button}
          value={create ? 'create' : 'access'}
          disabled={pending || (!create && data.self)}
        >
          {create ? 'Create and enroll' : 'Save access'}
        </button>
        {!create && (
          <>
            <button
              className={button}
              value={o.hasTotp ? 'recover' : 'enroll'}
              disabled={pending || (o.hasTotp && data.self)}
            >
              {o.hasTotp ? 'Start factor recovery' : 'Issue enrollment link'}
            </button>
            {o.enrollmentPending && (
              <button className={button} value="cancel_enrollment" disabled={pending}>
                Revoke enrollment link
              </button>
            )}
            <button className={button} value="revoke" disabled={pending}>
              Sign out everywhere
            </button>
          </>
        )}
      </div>
      {data.self && (
        <p>Another authorized operator must change your access or recover your factor.</p>
      )}
      {result && (
        <div role={result.error ? 'alert' : 'status'} className="space-y-3 break-all">
          <p>
            {result.error ||
              (result.enrollmentToken
                ? 'Enrollment link ready. Give it privately to the intended operator. It expires in 30 minutes.'
                : 'Change saved.')}
          </p>
          {result.code === 'RECENT_AUTH_REQUIRED' && (
            <Link className="underline" href="/admin/login?reauthenticate=1">
              Sign in again
            </Link>
          )}
          {result.code === 'OPERATOR_CHANGED' && (
            <button type="button" className={button} onClick={() => router.refresh()}>
              Reload operator
            </button>
          )}
          {result.enrollmentToken && (
            <>
              <label className="block">
                Private enrollment link
                <input
                  readOnly
                  className={input}
                  value={`${typeof window === 'undefined' ? '' : window.location.origin}/admin/enroll#${result.enrollmentToken}`}
                />
              </label>
              <Link href={`/admin/security/${result.id}`} className="underline">
                Open operator detail
              </Link>
            </>
          )}
        </div>
      )}
    </form>
  );
}
export function OperatorDirectory({ data }) {
  return (
    <section className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Operators & security</h1>
      <form className="flex flex-wrap items-end gap-3">
        <label>
          Search
          <input className={input} name="q" defaultValue={data.q} />
        </label>
        <label>
          Status
          <select className={input} name="status" defaultValue={data.status}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button className={button}>Search operators</button>
      </form>
      <p>
        {data.total} operators · Page {data.page} of {data.pages}
      </p>
      <ul className="space-y-3">
        {data.items.map((o) => (
          <li key={o.id} className={card}>
            <Link className="font-semibold underline" href={`/admin/security/${o.id}`}>
              {o.name}
            </Link>
            <p className="break-all">{o.email}</p>
            <p>
              {o.active ? 'Active' : 'Inactive'} ·{' '}
              {o.fullAccess ? 'Full Super Admin' : 'Assigned capabilities'} ·{' '}
              {o.enrollmentPending
                ? 'Enrollment pending'
                : o.hasTotp
                  ? 'Factor enrolled'
                  : 'Factor missing'}
            </p>
          </li>
        ))}
      </ul>
      {!data.items.length && <p>No operators match these filters.</p>}
      <Pagination
        page={data.page}
        pageSize={20}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Operator pages"
        noun="operators"
      />
      {data.canWrite && <CommandForm data={data} create />}
    </section>
  );
}
export function OperatorDetail({ data }) {
  const o = data.operator;
  return (
    <section className="space-y-6 p-4 sm:p-6">
      <Link className="underline" href="/admin/security">
        Back to operators
      </Link>
      <h1 className="text-2xl font-bold">{o.name}</h1>
      <p className="break-all">{o.email}</p>
      <p>
        {o.active ? 'Active' : 'Inactive'} · {o.hasTotp ? 'Factor enrolled' : 'Factor missing'}
        {o.enrollmentPending ? ' · Enrollment pending' : ''} · Version {o.version}
      </p>
      {o.lockedUntil && <p>Sign-in lock until {new Date(o.lockedUntil).toLocaleString()}</p>}
      {data.canWrite ? (
        <CommandForm data={data} />
      ) : (
        <section className={card}>
          <h2 className="font-semibold">Assigned capabilities</h2>
          <ul>
            {o.capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p>You have read-only access.</p>
        </section>
      )}
      <section className={card}>
        <h2 className="text-xl font-semibold">Active sessions</h2>
        <p>{data.sessions.length} sessions (latest 100). Use Sign out everywhere to revoke them.</p>
        <ul className="space-y-2">
          {data.sessions.map((s) => (
            <li key={s.id}>
              Signed in {new Date(s.created_at).toLocaleString()} · Expires{' '}
              {new Date(s.expires_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
      <section className={card}>
        <h2 className="text-xl font-semibold">Security history</h2>
        <ul className="space-y-3">
          {data.history.map((h, i) => (
            <li key={i}>
              <p>
                {h.action} · {new Date(h.created_at).toLocaleString()}
              </p>
              <p>{h.reason}</p>
            </li>
          ))}
        </ul>
        {!data.history.length && <p>No recorded security changes.</p>}
      </section>
    </section>
  );
}
export function OperatorEnrollment() {
  const [token, setToken] = useState(''),
    [result, setResult] = useState(null),
    [pending, start] = useTransition();
  function preview() {
    const t = token || window.location.hash.slice(1);
    window.history.replaceState(null, '', '/admin/enroll');
    setToken(t);
    start(async () => setResult(await enrollOperator({ token: t, command: 'preview' })));
  }
  function complete(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await enrollOperator({
        token,
        command: 'complete',
        password: f.get('password'),
        totp: f.get('totp'),
      });
      setResult(r.error ? { ...result, ...r } : r);
    });
  }
  return (
    <section className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Operator enrollment</h1>
      <p>
        Set your own password and enroll your authenticator. A link works once and expires after 30
        minutes.
      </p>
      {!result?.uri && !result?.ok && (
        <button className={button} disabled={pending} onClick={preview}>
          {token ? 'Retry enrollment' : 'Open enrollment'}
        </button>
      )}
      {result?.uri && (
        <form className={card} onSubmit={complete}>
          <p className="break-all">
            Enrolling {result.email}. Import this private URI into your authenticator app. Keep it
            private.
          </p>
          <label className="block">
            Authenticator setup URI
            <textarea readOnly className={`${input} break-all`} value={result.uri} />
          </label>
          <label className="block">
            New password
            <input
              className={input}
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label className="block">
            Authenticator code
            <input
              className={input}
              name="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
            />
          </label>
          <button className={button} disabled={pending}>
            Confirm enrollment
          </button>
        </form>
      )}
      {result?.error && <p role="alert">{result.error}</p>}
      {result?.ok && (
        <p role="status">
          Enrollment complete.{' '}
          <Link className="underline" href="/admin/login">
            Sign in with your password and authenticator
          </Link>
          .
        </p>
      )}
    </section>
  );
}
