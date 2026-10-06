import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight } from 'lucide-react';
import CopyChip from '@/components/portal/CopyChip';
import { detailTabHref } from '@/lib/domain/detail-navigation';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import AssignmentPanel from '@/components/admin/AssignmentPanel';
import { adminRecordReturnHref } from '@/lib/domain/admin-search';
import { applicationReturnHref } from '@/lib/domain/admin-navigation';
import DecisionPanel from '@/components/admin/DecisionPanel';
import DocumentViewer from '@/components/admin/DocumentViewer';
import { adminDateTime } from '@/lib/domain/admin-display';
import { AdminPage, AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';
import { buttonVariants } from '@/components/ui/button';
import { DetailTabs, RowList, SectionCard, pickTab } from '@/components/portal/DetailLayout';

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
const when = adminDateTime;

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
        <p className="mt-2 text-meta text-ink-700">
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
  const admin = await requireAdmin();
  const canWrite = Boolean(admin.capabilities?.includes('admin.applications.write'));
  const { id } = await params; // Next 16: params is a Promise
  const query = (await searchParams) ?? {};
  const queueHref = applicationReturnHref(query.from);
  const backHref = adminRecordReturnHref(query.from, queueHref);

  const { data, failure } = await settle(adminApi.application(id));
  if (failure)
    return (
      <PortalState
        kind={failure}
        backHref={backHref}
        backLabel={backHref.startsWith('/admin/search') ? 'Search results' : 'Applications'}
      />
    );

  const { app, user, trail, listings, completion, review } = data;
  const documents = data.documents ?? [];
  const waitingHours = review.waitingHours;
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: 'Documents', count: documents.length },
    { key: 'decision', label: 'Decision' },
    { key: 'history', label: 'History', count: trail.length },
  ];
  const active = pickTab(query.tab, tabs);
  const title = app.legalName || user.email;
  const notAwaiting =
    app.status !== 'submitted' ? (
      <p className="rounded-md border border-info/25 bg-info-bg p-3 text-meta text-ink-700">
        This application is <strong>{app.status.replace(/_/g, ' ')}</strong> and is not awaiting a
        decision.{' '}
        {app.decisionReason ? <>Last reason given: &ldquo;{app.decisionReason}&rdquo;</> : null}
      </p>
    ) : null;

  return (
    <AdminPage width="max-w-[1320px]">
      <AdminPageHeader
        backHref={backHref}
        backLabel={backHref.startsWith('/admin/search') ? 'Search results' : 'Applications'}
        title={title}
        description={user.email}
        action={
          admin.capabilities.includes('admin.clients.read') ? (
            <Link
              href={`/admin/clients/${user.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Owner record
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge tone={STATUS_TONE[app.status]} state={app.status} domain="application" />
        <span className="text-meta text-ink-600">
          {user.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner'}
        </span>
        <CopyChip label="Application ID" value={app.id} display={app.id.slice(0, 8)} />
        {app.payoutNameMatch === false ? (
          <StatusBadge tone="danger">Payout name mismatch</StatusBadge>
        ) : null}
        {app.status === 'submitted' ? (
          <span
            className={`text-meta ${review.overdue ? 'font-semibold text-danger' : 'text-ink-600'}`}
          >
            {waitingHours == null
              ? 'Not waiting'
              : `${waitingHours}h waiting${review.overdue ? ' / past 48h window' : ''}`}
          </span>
        ) : null}
      </div>
      <p className="mt-3 mb-6 text-meta text-ink-600">Submitted {when(app.submittedAt)}</p>

      <DetailTabs
        wrap
        tabs={tabs}
        active={active}
        basePath={`/admin/applications/${app.id}`}
        params={query}
      />

      <div className="mt-6 space-y-5">
        {active === 'overview' ? (
          <>
            {notAwaiting}
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section
                id="checklist"
                className="min-w-0 scroll-mt-24 overflow-hidden rounded-lg border border-border bg-card"
              >
                <Panel title="Identity">
                  <Row label="Email" value={user.email} />
                  <Row
                    label="Email verification"
                    value={user.emailVerifiedAt ? 'Verified' : 'Not verified'}
                  />
                  <Row
                    label="Mobile verification"
                    value={user.phoneVerifiedAt ? 'Verified' : 'Not verified'}
                  />
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
                    label="Name comparison (not verification)"
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
                    <p className="mt-3 text-meta leading-6 text-danger">
                      Blocks approval. Ask for a payout destination in the applicant&apos;s own
                      name.
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
                  <Row label="Status" value={user.accountStatus.replace(/_/g, ' ')} />
                  <Row label="Joined" value={when(user.createdAt)} />
                  <Row
                    label="Identity documents"
                    value={user.kycStatus === 'verified' ? 'reviewed by Rentra' : user.kycStatus}
                  />
                  <Row
                    label="Steps complete"
                    value={`${completion.done} of ${completion.total}`}
                    ok={completion.done === completion.total}
                  />
                  <Row
                    label="Strikes"
                    value={`${app.strikeCount} of 3`}
                    bad={app.strikeCount >= 2}
                  />
                  <Row label="Existing listings" value={listings.length} />
                </Panel>
              </section>
              <aside className="min-w-0 space-y-5">
                <AssignmentPanel applicationId={app.id} review={review} canWrite={canWrite} />
                <ReviewState review={review} />
                <Link
                  href={detailTabHref(`/admin/applications/${app.id}`, 'decision', tabs, query)}
                  className={buttonVariants({ className: 'w-full' })}
                >
                  Open decision
                </Link>
                <p className="text-meta leading-6 text-ink-600">
                  {completion.done} of {completion.total} onboarding steps complete.{' '}
                  {documents.length} documents uploaded; {listings.length} properties already
                  created.
                </p>
              </aside>
            </div>
          </>
        ) : null}

        {active === 'documents' ? (
          <div id="documents" className="scroll-mt-24">
            <DocumentViewer
              canRead={admin.capabilities.includes('admin.documents.read')}
              canWrite={admin.capabilities.includes('admin.documents.write')}
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
              <AssignmentPanel applicationId={app.id} review={review} canWrite={canWrite} />
            </div>
            {app.status === 'submitted' ? (
              <div id="decision" className="scroll-mt-24">
                <DecisionPanel
                  applicationId={app.id}
                  returnHref={queueHref}
                  strikeCount={app.strikeCount}
                  reviewVersion={review.reviewVersion}
                  canWrite={canWrite}
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
                    <span className="block text-meta text-ink-500">
                      {when(t.at)} · {t.adminEmail ? `by ${t.adminEmail}` : t.actorType}
                      {t.ip ? ` · ${t.ip}` : ''}
                    </span>
                    {t.reason ? (
                      <span className="block text-meta text-ink-600">&ldquo;{t.reason}&rdquo;</span>
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

function Panel({ title, children }) {
  return (
    <section className="border-b border-border p-5 last:border-b-0 sm:p-6">
      <h2 className="mb-3 text-h3 font-semibold text-ink-900">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, value, bad, mono }) {
  return (
    <dl className="grid gap-1 border-b border-border py-3 text-meta last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-6">
      <dt className="text-ink-600">{label}</dt>
      <dd
        className={`min-w-0 break-words font-medium ${bad ? 'text-danger' : 'text-ink-900'} ${mono ? 'font-mono' : ''}`}
      >
        {String(value)}
      </dd>
    </dl>
  );
}
