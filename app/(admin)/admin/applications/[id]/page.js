import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, X, AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { getApplicationForReview } from '@/lib/db/admin-queries';
import { profileCompletion } from '@/lib/auth/profile';
import DecisionPanel from '@/components/admin/DecisionPanel';
import DocumentViewer from '@/components/admin/DocumentViewer';

export const metadata = {
  title: 'Application review',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ApplicationReviewPage({ params }) {
  await requireAdmin();
  const { id } = await params; // Next 16: params is a Promise

  const data = await getApplicationForReview(id);
  if (!data) notFound();

  const { app, user, trail, listings } = data;
  const completion = profileCompletion(user, app, data.documents ?? []);


  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to queue
      </Link>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-h1">{app.legalName || user.email}</h1>
        <span className={`rounded-full px-3 py-1 text-tiny font-bold ${
          app.status === 'submitted' ? 'bg-amber-100 text-amber-700'
            : app.status === 'approved' ? 'bg-brand-50 text-brand-700'
              : app.status === 'rejected' ? 'bg-danger-bg text-danger'
                : 'bg-ink-100 text-ink-600'
        }`}>
          {app.status.replace(/_/g, ' ')}
        </span>
      </div>

      {app.status !== 'submitted' ? (
        <p className="mt-4 rounded-md border-l-4 border-blue bg-info-bg p-3 text-meta text-ink-700">
          This application is <strong>{app.status.replace(/_/g, ' ')}</strong> and is not awaiting a
          decision. {app.decisionReason ? <>Last reason given: &ldquo;{app.decisionReason}&rdquo;</> : null}
        </p>
      ) : null}

      {/* ---------------- the checklist ---------------- */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Panel title="Identity">
          <Row label="Email" value={user.email} ok={Boolean(user.emailVerifiedAt)} />
          <Row label="Mobile" value={user.phone ? `+91 ${user.phone}` : '—'} ok={Boolean(user.phoneVerifiedAt)} />
          <Row label="Language" value={user.preferredLocale} />
          <Row
            label="Listing as"
            value={user.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner'}
          />
          {user.clientType === 'authorised_agent' ? (
            <>
              <Row label="Owner's name" value={app.ownerName || '—'} ok={Boolean(app.ownerName)} />
              <Row label="Relationship" value={app.ownerRelationship || '—'} />
            </>
          ) : null}
        </Panel>

        <Panel title="Address">
          <Row label="Address" value={app.residentialAddress || '—'} ok={Boolean(app.residentialAddress)} />
          <Row label="Pincode" value={app.pincode || '—'} />
          <Row label="Plans to list" value={app.intendedListingCount ?? '—'} />
        </Panel>

        <Panel title="Payout" tone={app.payoutNameMatch === false ? 'bad' : undefined}>
          <Row label="Method" value={app.payoutUpiId ? 'UPI' : app.payoutAccountRef ? 'Bank' : '—'} />
          <Row label="Destination" value={app.payoutUpiId ?? app.payoutAccountRef ?? '—'} mono />
          {app.payoutIfsc ? <Row label="IFSC" value={app.payoutIfsc} mono /> : null}
          <Row label="Holder name" value={app.payoutHolderName ?? '—'} />
          <Row
            label="Matches ID"
            value={app.payoutNameMatch === true ? 'Yes' : app.payoutNameMatch === false ? 'NO' : 'Not checked'}
            ok={app.payoutNameMatch === true}
            bad={app.payoutNameMatch === false}
          />
          {app.payoutNameMatch === false ? (
            <p className="mt-2 text-tiny text-danger">
              Blocks approval. Paying out to a third-party account is how a marketplace becomes a
              laundering route — get a destination in their own verified name.
            </p>
          ) : null}
        </Panel>

        <Panel title="Consent">
          <Row label="Accepted terms" value={app.consentAt ? new Date(app.consentAt).toLocaleString('en-IN') : '—'} ok={Boolean(app.consentAt)} />
          <Row label="From IP" value={app.consentIp ?? '—'} mono />
        </Panel>

        <Panel title="Account">
          <Row label="Status" value={user.accountStatus} />
          <Row label="KYC status" value={user.kycStatus} />
          <Row label="Steps complete" value={`${completion.done} of ${completion.total}`} ok={completion.done === completion.total} />
          <Row label="Strikes" value={`${app.strikeCount} of 3`} bad={app.strikeCount >= 2} />
          <Row label="Joined" value={new Date(user.createdAt).toLocaleDateString('en-IN')} />
          <Row label="Existing listings" value={listings.length} />
        </Panel>
      </section>

      {/* Full width: this is the evidence the whole decision rests on. */}
      <div className="mt-4">
        <DocumentViewer
          documents={data.documents ?? []}
          kycNameOnDoc={app.kycNameOnDoc}
          accountName={user.name}
        />
      </div>

      {app.status === 'submitted' ? (
        <div className="mt-6">
          <DecisionPanel applicationId={app.id} strikeCount={app.strikeCount} />
        </div>
      ) : null}

      {/* ---------------- audit trail ---------------- */}
      <section className="mt-8">
        <h2 className="text-h3">Everything that has happened</h2>
        <p className="mt-1 text-meta text-ink-600">
          This is what makes a decision defensible three months from now.
        </p>
        <ol className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {trail.length === 0 ? (
            <li className="px-4 py-3 text-meta text-ink-500">No activity recorded.</li>
          ) : trail.map((t, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-meta">
              <span className="font-mono text-tiny text-ink-500 tabular">
                {new Date(t.at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
              <span className="font-semibold text-ink-900">{t.action.replace(/_/g, ' ')}</span>
              <span className="text-tiny text-ink-500">
                {t.adminEmail ? `by ${t.adminEmail}` : t.actorType}
                {t.ip ? ` · ${t.ip}` : ''}
              </span>
              {t.reason ? (
                <span className="w-full text-tiny text-ink-600">&ldquo;{t.reason}&rdquo;</span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Panel({ title, tone, children }) {
  const border = tone === 'bad' ? 'border-danger/40' : tone === 'warn' ? 'border-amber-300' : 'border-border';
  return (
    <div className={`rounded-lg border bg-card p-4 ${border}`}>
      <h2 className="text-tiny font-bold tracking-wider text-brand-700 uppercase">{title}</h2>
      <dl className="mt-2">{children}</dl>
    </div>
  );
}

function Row({ label, value, ok, bad, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border py-1.5 text-meta last:border-b-0">
      <dt className="shrink-0 text-ink-600">{label}</dt>
      <dd className={`min-w-0 truncate text-right font-medium ${
        bad ? 'text-danger' : ok ? 'text-brand-700' : 'text-ink-900'
      } ${mono ? 'font-mono text-tiny' : ''}`}>
        {ok === true ? <Check className="mr-1 inline size-3.5" aria-hidden="true" /> : null}
        {bad === true ? <AlertTriangle className="mr-1 inline size-3.5" aria-hidden="true" /> : null}
        {ok === false && bad !== true ? <X className="mr-1 inline size-3.5 text-ink-400" aria-hidden="true" /> : null}
        {String(value)}
      </dd>
    </div>
  );
}
