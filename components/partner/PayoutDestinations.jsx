import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import SettingsHeading from './settings/SettingsHeading';
import {
  ChangeDestinationForm,
  ConfirmPayoutIdentityForm,
  SubmitDraftForm,
} from './PayoutDestinationForms';

const ist = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
const chip = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-meta font-semibold';
const TONE = {
  submitted: 'bg-warning-bg text-warning',
  verified: 'bg-success-bg text-success',
  failed: 'bg-danger-bg text-danger',
  draft: 'bg-info-bg text-ink-800',
  superseded: 'bg-ink-50 text-ink-700',
};
const NAME = {
  same: 'Name matches your ID name',
  different: 'Name differs from your ID name',
  unknown: 'Name not compared',
};

function Version({ d }) {
  return (
    <div className="space-y-2 text-meta">
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        Version {d.version} · {d.masked}{' '}
        <span className={`${chip} ${TONE[d.state]}`}>{d.stateLabel}</span>
      </p>
      <p className="text-ink-600">
        {d.holderName} · {NAME[d.nameCheck]} (a comparison, not verification)
        {d.submittedAt ? ` · submitted ${ist(d.submittedAt)}` : ''}
      </p>
      {d.state === 'failed' ? <p className="text-danger">Reason: {d.failureReason}</p> : null}
    </div>
  );
}

export default function PayoutDestinations({ data }) {
  const auth = data.recentAuth;
  return (
    <section>
      <SettingsHeading
        title="Payout method"
        description="Manage where Rentra will send earnings once payouts are switched on."
      />
      <p
        role="status"
        className="mb-6 rounded-md border border-border bg-card p-4 text-meta leading-6 text-ink-600"
      >
        <strong className="text-ink-900">Payouts are not switched on yet.</strong>{' '}
        {data.current?.masked
          ? `Your payout method is recorded: ${data.current.masked}.`
          : data.readiness.reason}
      </p>
      <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <h2 className="mb-4 text-h3 font-semibold">Current method</h2>
        {data.current ? (
          <Version d={data.current} />
        ) : (
          <p className="text-meta text-ink-600">
            No payout method on file. Add a bank account or UPI destination below.
          </p>
        )}
      </section>
      {data.draft && (
        <section className="mt-7 border-t border-border pt-6">
          <h2 className="mb-4 text-h3 font-semibold">Draft waiting for confirmation</h2>
          <Version d={data.draft} />
          {auth.required && !auth.fresh ? (
            <div className="mt-4 space-y-4">
              <p className="text-meta leading-6 text-ink-600">
                Confirm your identity within the last {auth.minutes} minutes to submit this change.
                Your draft is kept.
              </p>
              <ConfirmPayoutIdentityForm />
            </div>
          ) : (
            <div className="mt-4">
              <SubmitDraftForm
                key={`draft-${data.latestVersion}`}
                draft={data.draft}
                latestVersion={data.latestVersion}
              />
            </div>
          )}
        </section>
      )}
      <details
        open={!data.current && !data.draft}
        id="destination-form"
        className="mt-7 rounded-lg border border-border bg-card p-5 sm:p-6"
      >
        <summary className="min-h-11 cursor-pointer text-h3 font-semibold">
          {data.current ? 'Change payout method' : 'Add payout method'}
        </summary>
        <div className="mt-5 space-y-5">
          <p className="max-w-[65ch] text-meta leading-6 text-ink-600">
            {auth.required
              ? auth.fresh
                ? `Identity confirmed at ${ist(auth.authenticatedAt)}. Changes can be submitted until ${ist(auth.freshUntil)}.`
                : `You signed in at ${ist(auth.authenticatedAt)}. A change is saved as a draft until you confirm your identity.`
              : 'Your application is still under review; Rentra checks these details at review.'}{' '}
            Payouts already scheduled keep the version they were created with.
          </p>
          {auth.required && !auth.fresh && !data.draft && <ConfirmPayoutIdentityForm />}
          <ChangeDestinationForm
            key={`change-${data.latestVersion}`}
            latestVersion={data.latestVersion}
            requestKey={randomUUID()}
            current={data.current}
          />
        </div>
      </details>
      <details className="mt-7 border-t border-border pt-6">
        <summary className="min-h-11 cursor-pointer text-h3 font-semibold">
          Change history{' '}
          <span className="text-meta font-normal text-ink-500">({data.history.length})</span>
        </summary>
        {data.history.length ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
            {data.history.map((d) => (
              <li key={d.id} className="p-5 text-meta sm:p-6">
                <Version d={d} />
                <p className="mt-3 text-ink-600">Submitted {ist(d.submittedAt)} IST</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-meta text-ink-600">
            No payout changes yet. Your change history will appear here.
          </p>
        )}
      </details>
      <Link
        href="/partner/earnings"
        className="mt-6 inline-flex min-h-11 items-center text-meta font-semibold text-brand-800 hover:underline"
      >
        View earnings
      </Link>
    </section>
  );
}
