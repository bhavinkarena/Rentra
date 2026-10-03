import OwnerTable from './OwnerTable';
import { EmptyState } from '@/components/ui/empty-state';
import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { History, ShieldAlert, ShieldCheck, WalletCards } from 'lucide-react';
import { PartnerPageHeader } from './PortalPrimitives';
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
const chip = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
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

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-h4 font-bold text-ink-900">
        <Icon className="size-[18px] text-brand-700" aria-hidden="true" /> {title}
      </h2>
      <div className="mt-4 space-y-3 text-meta">{children}</div>
    </section>
  );
}

function Version({ d }) {
  return (
    <div className="space-y-1">
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
    <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link
        href="/partner/earnings"
        className="mb-3 inline-flex min-h-9 items-center text-tiny font-semibold text-brand-700 hover:underline"
      >
        ← Earnings
      </Link>
      <PartnerPageHeader
        eyebrow="Account"
        title="Payout method"
        description="Where Rentra will send earnings once payouts are switched on. We’ll ask you to confirm these details with our payment partner before your first payout."
      />
      <div className="mt-6 space-y-5">
        <p
          role="status"
          className={`flex items-start gap-2 rounded-md border-l-4 p-3 text-meta ${data.readiness.ready ? 'border-success bg-success-bg' : 'border-warning bg-warning-bg text-warning'}`}
        >
          {data.readiness.ready ? (
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            <strong>{'Payouts are not switched on yet.'}</strong>{' '}
            {data.current?.masked
              ? `Your payout method is recorded: ${data.current.masked}.`
              : data.readiness.reason}
          </span>
        </p>
        <Card title="Current payout method" icon={WalletCards}>
          {data.current ? (
            <Version d={data.current} />
          ) : (
            <EmptyState
              variant="compact"
              title="No payout method on file"
              description="Add a bank account or UPI destination to prepare for payouts."
              actionHref="#destination-form"
              actionLabel="Add payout method"
            />
          )}
        </Card>
        {data.draft ? (
          <Card title="Draft waiting for confirmation" icon={History}>
            <Version d={data.draft} />
            {auth.required && !auth.fresh ? (
              <>
                <p>
                  Changes to where money goes need identity confirmation within the last{' '}
                  {auth.minutes} minutes. Your draft is kept.
                </p>
                <ConfirmPayoutIdentityForm />
              </>
            ) : (
              <SubmitDraftForm
                key={`draft-${data.latestVersion}`}
                draft={data.draft}
                latestVersion={data.latestVersion}
              />
            )}
          </Card>
        ) : null}
        <div id="destination-form" className="scroll-mt-24">
          <Card title="Change payout method" icon={WalletCards}>
            <p className="text-ink-600">
              {auth.required
                ? auth.fresh
                  ? `Identity last confirmed at ${ist(auth.authenticatedAt)} — changes can be submitted until ${ist(auth.freshUntil)}.`
                  : `You signed in at ${ist(auth.authenticatedAt)}. A change will be saved as a draft until you confirm your identity.`
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
          </Card>
        </div>
        <Card title="History" icon={History}>
          {data.history.length ? (
            <OwnerTable
              label="Payout method history"
              columns={['Version / method', 'Holder', 'Status', 'Submitted (IST)', 'Notes']}
            >
              {data.history.map((destination) => (
                <tr key={destination.id}>
                  <td>
                    Version {destination.version}
                    <strong className="block">{destination.masked}</strong>
                  </td>
                  <td>{destination.holderName}</td>
                  <td>
                    <span className={`${chip} ${TONE[destination.state]}`}>
                      {destination.stateLabel}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{ist(destination.submittedAt)}</td>
                  <td>
                    {NAME[destination.nameCheck]} (a comparison, not verification)
                    {destination.state === 'failed' && (
                      <p className="text-danger">Reason: {destination.failureReason}</p>
                    )}
                  </td>
                </tr>
              ))}
            </OwnerTable>
          ) : (
            <EmptyState
              variant="compact"
              title="No payout changes yet"
              description="Changes to your payout destination appear here."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
