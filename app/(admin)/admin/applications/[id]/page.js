import Link from 'next/link';
import { AlertTriangle, CalendarDays, Check, Clock, Mail, Phone, X } from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import AssignmentPanel from '@/components/admin/AssignmentPanel';
import { safeReturnPath } from '@/lib/domain/portal-state';
import DecisionPanel from '@/components/admin/DecisionPanel';
import DocumentViewer from '@/components/admin/DocumentViewer';
import { AdminPage } from '@/components/admin/AdminPrimitives';
import {
  DetailHeader,
  DetailTabs,
  MetricStrip,
  RowList,
  SectionCard,
  pickTab,
} from '@/components/portal/DetailLayout';

export const metadata = {
  title: 'Application review',
  robots: { index: false, follow: false, nocache: true },
};

const STATUS_TONE = {
  submitted: 'warning',
  approved: 'success',
  rejected: 'danger',
  more_info_needed: 'warning',
  draft: 'neutral',
};
const when = (value, options = { dateStyle: 'medium', timeStyle: 'short' }) =>
  value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...options }) : '—';

function ReviewState({ review }) {
  return (
    <SectionCard id="review-state" title="Review state">
      <p className="text-meta text-ink-800">
        Version {review.reviewVersion} · submitted {review.submissions} time
        {review.submissions === 1 ? '' : 's'}
        {review.lastDecision
          ? ` · last decision: ${review.lastDecision.action.replace('application_', '').replace(/_/g, ' ')}`
          : ''}
      </p>
      {review.changedSinceLastDecision ? (
        <p className="mt-2 text-tiny text-ink-700">
          {review.changedSinceLastDecision.length
            ? `Changed since the last decision: ${review.changedSinceLastDecision
                .map((field) => FIELD_LABELS[field] ?? field)
                .join(', ')}.`
            : 'Nothing reviewed has changed since the last decision.'}
        </p>
      ) : null}
    </SectionCard>
  );
}

export default async function ApplicationReviewPage({ params, searchParams }) {
  await requireAdmin();
  const { id } = await params; // Next 16: params is a Promise
  const query = (await searchParams) ?? {};
  const queueHref = safeReturnPath(query.from, '/admin');

  const { data, failure } = await settle(adminApi.application(id));
  if (failure) return <PortalState kind={failure} backHref={queueHref} backLabel="Applications" />;

  const { app, user, trail, listings, completion, review } = data;
  const documents = data.documents ?? [];
  const waitingHours = review.waitingHours;
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: 'Documents', count: documents.length },
    { key: 'decision', label: 'Decision' },
    { key: 'history', label: 'Activity log', count: trail.length },
  ];
  const active = pickTab(query.tab, tabs);
  const title = app.legalName || user.email;
  const notAwaiting =
    app.status !== 'submitted' ? (
      <p className="rounded-md border-l-4 border-blue bg-info-bg p-3 text-meta text-ink-700">
        This application is <strong>{app.status.replace(/_/g, ' ')}</strong> and is not awaiting a
        decision.{' '}
        {app.decisionReason ? <>Last reason given: &ldquo;{app.decisionReason}&rdquo;</> : null}
      </p>
    ) : null;

  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: queueHref, label: 'Applications' }, { label: title }]}
        title={title}
        avatar={app.legalName || user.name || user.email}
        badges={[
          { label: app.status.replace(/_/g, ' '), tone: STATUS_TONE[app.status] },
          {
            label: user.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner',
            tone: 'info',
          },
          app.payoutNameMatch === false ? { label: 'Payout name mismatch', tone: 'danger' } : null,
          review.overdue ? { label: 'Past 48h window', tone: 'danger' } : null,
        ].filter(Boolean)}
        id={{ label: 'Application ID', value: app.id, display: app.id.slice(0, 8) }}
        chips={[
          { icon: Mail, value: user.email },
          user.phone ? { icon: Phone, value: `+91 ${user.phone}` } : null,
          { icon: CalendarDays, label: 'Submitted', value: when(app.submittedAt) },
          { icon: Clock, label: 'Joined', value: when(user.createdAt, { dateStyle: 'medium' }) },
        ]}
        actions={
          <Link
            href={`/admin/clients/${user.id}`}
            className="inline-flex min-h-9 items-center rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
          >
            Open client record →
          </Link>
        }
      />

      <MetricStrip
        items={[
          {
            label: 'Waiting',
            value: waitingHours == null ? '—' : `${waitingHours}h`,
            hint: 'since submission',
            tone: review.overdue ? 'danger' : 'neutral',
          },
          {
            label: 'Steps complete',
            value: `${completion.done} / ${completion.total}`,
            hint: 'client side',
            tone: completion.done === completion.total ? 'success' : 'warning',
          },
          { label: 'Documents', value: documents.length, hint: 'uploaded' },
          {
            label: 'Strikes',
            value: `${app.strikeCount} / 3`,
            hint: 'rejections',
            tone: app.strikeCount >= 2 ? 'danger' : 'neutral',
          },
          {
            label: 'Submissions',
            value: review.submissions,
            hint: `review version ${review.reviewVersion}`,
          },
          { label: 'Properties', value: listings.length, hint: 'already created' },
        ]}
      />

      <DetailTabs
        tabs={tabs}
        active={active}
        basePath={`/admin/applications/${app.id}`}
        params={query}
      />

      <div className="mt-6 space-y-5">
        {active === 'overview' ? (
          <>
            {notAwaiting}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <ReviewState review={review} />
              <AssignmentPanel applicationId={app.id} review={review} />
            </div>
            <section
              id="checklist"
              className="grid scroll-mt-24 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <Panel title="Identity">
                <Row label="Email" value={user.email} ok={Boolean(user.emailVerifiedAt)} />
                <Row
                  label="Mobile"
                  value={user.phone ? `+91 ${user.phone}` : '—'}
                  ok={Boolean(user.phoneVerifiedAt)}
                />
                <Row label="Language" value={user.preferredLocale} />
                <Row
                  label="Listing as"
                  value={user.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner'}
                />
                {user.clientType === 'authorised_agent' ? (
                  <>
                    <Row
                      label="Owner's name"
                      value={app.ownerName || '—'}
                      ok={Boolean(app.ownerName)}
                    />
                    <Row label="Relationship" value={app.ownerRelationship || '—'} />
                  </>
                ) : null}
              </Panel>

              <Panel title="Address">
                <Row
                  label="Address"
                  value={app.residentialAddress || '—'}
                  ok={Boolean(app.residentialAddress)}
                />
                <Row label="Pincode" value={app.pincode || '—'} />
                <Row label="Plans to list" value={app.intendedListingCount ?? '—'} />
              </Panel>

              <Panel title="Payout" tone={app.payoutNameMatch === false ? 'bad' : undefined}>
                <Row
                  label="Method"
                  value={app.payoutUpiId ? 'UPI' : app.payoutAccountRef ? 'Bank' : '—'}
                />
                <Row
                  label="Destination"
                  value={app.payoutUpiId ?? app.payoutAccountRef ?? '—'}
                  mono
                />
                {app.payoutIfsc ? <Row label="IFSC" value={app.payoutIfsc} mono /> : null}
                <Row label="Holder name" value={app.payoutHolderName ?? '—'} />
                <Row
                  label="Name comparison"
                  value={
                    app.payoutNameMatch === true
                      ? 'Yes'
                      : app.payoutNameMatch === false
                        ? 'NO'
                        : 'Not compared'
                  }
                  ok={app.payoutNameMatch === true}
                  bad={app.payoutNameMatch === false}
                />
                {app.payoutNameMatch === false ? (
                  <p className="mt-2 text-tiny text-danger">
                    Blocks approval. Paying out to a third-party account is how a marketplace
                    becomes a laundering route — get a destination in their own verified name.
                  </p>
                ) : null}
              </Panel>

              <Panel title="Consent">
                <Row
                  label="Accepted terms"
                  value={app.consentAt ? when(app.consentAt) : '—'}
                  ok={Boolean(app.consentAt)}
                />
                <Row label="From IP" value={app.consentIp ?? '—'} mono />
              </Panel>

              <Panel title="Account">
                <Row label="Status" value={user.accountStatus} />
                <Row
                  label="Identity documents"
                  value={user.kycStatus === 'verified' ? 'reviewed by Rentra' : user.kycStatus}
                />
                <Row
                  label="Steps complete"
                  value={`${completion.done} of ${completion.total}`}
                  ok={completion.done === completion.total}
                />
                <Row label="Strikes" value={`${app.strikeCount} of 3`} bad={app.strikeCount >= 2} />
                <Row label="Existing listings" value={listings.length} />
              </Panel>
            </section>
          </>
        ) : null}

        {active === 'documents' ? (
          <div id="documents" className="scroll-mt-24">
            <DocumentViewer
              documents={documents}
              kycNameOnDoc={app.kycNameOnDoc}
              accountName={user.name}
            />
          </div>
        ) : null}

        {active === 'decision' ? (
          <>
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <ReviewState review={review} />
              <AssignmentPanel applicationId={app.id} review={review} />
            </div>
            {app.status === 'submitted' ? (
              <div id="decision" className="scroll-mt-24">
                <DecisionPanel
                  applicationId={app.id}
                  strikeCount={app.strikeCount}
                  reviewVersion={review.reviewVersion}
                />
              </div>
            ) : (
              notAwaiting
            )}
          </>
        ) : null}

        {active === 'history' ? (
          <SectionCard
            id="history"
            title="Activity log"
            description="What makes a decision defensible months later"
            flush
          >
            <RowList
              items={trail}
              empty="No activity recorded."
              render={(t, i) => (
                <li key={i} className="flex gap-3 px-5 py-3.5 text-meta">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900 capitalize">
                      {t.action.replace(/_/g, ' ')}
                    </span>
                    <span className="block text-tiny text-ink-500">
                      {when(t.at)} · {t.adminEmail ? `by ${t.adminEmail}` : t.actorType}
                      {t.ip ? ` · ${t.ip}` : ''}
                    </span>
                    {t.reason ? (
                      <span className="block text-tiny text-ink-600">&ldquo;{t.reason}&rdquo;</span>
                    ) : null}
                  </span>
                </li>
              )}
            />
          </SectionCard>
        ) : null}
      </div>
    </AdminPage>
  );
}

const FIELD_LABELS = {
  name: 'account name',
  phone: 'mobile',
  clientType: 'owner or agent',
  legalName: 'legal name',
  residentialAddress: 'address',
  pincode: 'pincode',
  ownerName: "owner's name",
  ownerRelationship: 'relationship',
  kycDocType: 'ID type',
  kycNameOnDoc: 'name on ID',
  payoutDestination: 'payout destination',
  payoutHolderName: 'payout holder name',
  documents: 'uploaded documents',
};

function Panel({ title, tone, children }) {
  const border =
    tone === 'bad' ? 'border-danger/40' : tone === 'warn' ? 'border-amber-300' : 'border-border';
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
      <dd
        className={`min-w-0 truncate text-right font-medium ${
          bad ? 'text-danger' : ok ? 'text-brand-700' : 'text-ink-900'
        } ${mono ? 'font-mono text-tiny' : ''}`}
      >
        {ok === true ? <Check className="mr-1 inline size-3.5" aria-hidden="true" /> : null}
        {bad === true ? (
          <AlertTriangle className="mr-1 inline size-3.5" aria-hidden="true" />
        ) : null}
        {ok === false && bad !== true ? (
          <X className="mr-1 inline size-3.5 text-ink-400" aria-hidden="true" />
        ) : null}
        {String(value)}
      </dd>
    </div>
  );
}
