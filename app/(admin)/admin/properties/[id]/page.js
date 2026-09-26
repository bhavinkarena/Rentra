import Link from 'next/link';
import { CalendarDays, CheckCircle2, CircleAlert, Hash, Mail, UserCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';
import PortalState from '@/components/portal/PortalState';
import {
  DetailHeader,
  DetailTabs,
  MetricStrip,
  pickTab,
  SectionCard,
  FieldGrid,
} from '@/components/portal/DetailLayout';
import { AdminPage } from '@/components/admin/AdminPrimitives';
import PropertyReviewForm from '@/components/admin/PropertyReviewForm';
import VerificationPanel from '@/components/admin/VerificationPanel';
import PropertyLifecyclePanel from '@/components/admin/PropertyLifecyclePanel';
import { diffRevisions } from '@/lib/domain/revision-diff';
import { normalizePublicPhotos } from '@/lib/domain/listing-content';
import { listingPath } from '@/lib/domain/listing-url';

const tabs = [
  { key: 'submission', label: 'Submitted property' },
  { key: 'decision', label: 'Review & decision' },
  { key: 'verification', label: 'Verification & publication' },
  { key: 'visibility', label: 'Visibility & corrections' },
  { key: 'history', label: 'History & activity' },
];
const STATUS_TONE = {
  pending_review: 'warning',
  pending_verification: 'info',
  live: 'success',
  rejected: 'danger',
  draft: 'neutral',
  paused: 'neutral',
  hidden: 'danger',
};
const ACTION_LABEL = {
  listing_draft_created: 'Draft created',
  listing_submitted: 'Submitted for review',
  listing_review_assigned: 'Reviewer assignment changed',
  listing_review_decided: 'Review decision',
  verification_scheduled: 'Verification scheduled',
  verification_rescheduled: 'Verification rescheduled',
  verification_cancelled: 'Verification cancelled',
  verification_recorded: 'Verification outcome recorded',
  listing_published: 'Published',
  listing_hidden: 'Hidden by Rentra',
  listing_restored: 'Restored by Rentra',
  listing_corrected: 'Corrected by Rentra',
  listing_paused: 'Paused by the client',
  listing_resumed: 'Resumed by the client',
  listing_photos_added: 'Photos added',
  listing_photos_reordered: 'Photos reordered',
  ownership_document_uploaded: 'Ownership document uploaded',
};
const statusLabel = (status) =>
  status === 'hidden' ? 'hidden by Rentra' : String(status ?? '—').replaceAll('_', ' ');
const ist = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
const VISIT_MODE = { video_call: 'Video call', physical: 'Site visit' };
const display = (value) =>
  value == null
    ? 'Not provided'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
export default async function PropertyReviewDetail({ params, searchParams }) {
  const admin = await requireAdmin();
  const { id } = await params,
    query = await searchParams;
  const back = safeReturnPath(query?.from, '/admin/properties');
  const { data, failure } = await settle(adminApi.property(id));
  if (failure) return <PortalState kind={failure} backHref={back} />;
  const tab = pickTab(query?.tab, tabs),
    current = data.current;
  const selected = data.submissions.find((s) => s.id === query?.revision) ?? current;
  const snap = selected?.snapshot,
    listing = snap?.listing;
  const photos = normalizePublicPhotos(selected?.displayPhotos ?? snap?.photos);
  // Compare with the published revision, or else the pass before this one.
  const published = data.submissions.find((s) => s.id === data.publication.publishedSubmissionId);
  const base =
    published && published.id !== selected?.id
      ? published
      : data.submissions.find((s) => s.passNumber === (selected?.passNumber ?? 0) - 1);
  const changes = base && snap ? diffRevisions(base.snapshot, snap) : [];
  const canDecide = Boolean(
    current &&
    !data.stale &&
    data.property.status === 'pending_review' &&
    data.property.accountStatus === 'active',
  );
  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: back, label: 'Property review' }, { label: data.property.title }]}
        title={data.property.title}
        badges={[
          {
            label: statusLabel(data.property.status),
            tone: STATUS_TONE[data.property.status] ?? 'neutral',
          },
          data.stale ? { label: 'Unsubmitted changes', tone: 'danger' } : null,
          data.property.accountStatus !== 'active'
            ? { label: 'Client restricted', tone: 'danger' }
            : null,
        ].filter(Boolean)}
        id={{ label: 'Property ID', value: id, display: id.slice(0, 8) }}
        chips={[
          { icon: Mail, label: 'Client', value: data.property.email },
          { icon: Hash, label: 'Pass', value: current?.passNumber ?? 'Not submitted' },
          current
            ? { icon: CalendarDays, label: 'Submitted', value: ist(current.submittedAt) }
            : null,
          { icon: UserCheck, label: 'Reviewer', value: current?.reviewer ?? 'Unassigned' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/clients/${data.property.clientId}`}
              className="inline-flex min-h-9 items-center rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
            >
              Client record →
            </Link>
            {data.property.applicationId ? (
              <Link
                href={`/admin/applications/${data.property.applicationId}`}
                className="inline-flex min-h-9 items-center rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
              >
                Gate 1 application →
              </Link>
            ) : null}
          </div>
        }
      />
      <MetricStrip
        items={[
          {
            label: 'Readiness',
            value: data.readiness ? `${data.readiness.done} / ${data.readiness.total}` : '—',
            hint: 'sections in the submitted revision',
            tone: data.readiness && !data.readiness.remaining.length ? 'success' : 'warning',
          },
          { label: 'Photos', value: snap?.photos?.length ?? 0, hint: 'submitted' },
          { label: 'Amenities', value: snap?.amenities?.length ?? 0, hint: 'submitted' },
          { label: 'Evidence', value: snap?.documents?.length ?? 0, hint: 'private documents' },
          { label: 'Submissions', value: data.submissions.length, hint: 'immutable revisions' },
          { label: 'Decisions', value: data.history.length, hint: 'recorded' },
          {
            label: 'Publication',
            value:
              data.property.status === 'live'
                ? 'Live'
                : data.publication.eligible
                  ? 'Ready'
                  : 'Blocked',
            hint: data.publication.inventory.bookable ? 'bookable' : 'not bookable yet',
            tone:
              data.property.status === 'live' || data.publication.eligible ? 'success' : 'neutral',
          },
        ]}
      />
      {data.stale ? (
        <p role="status" className="mt-5 rounded-md bg-warning-bg p-4 text-meta text-amber-800">
          The current property has no matching submitted revision. Ask the client to review their
          changes and resubmit. No decision can be recorded yet.
        </p>
      ) : null}
      {data.property.accountStatus !== 'active' ? (
        <p className="mt-4 text-meta text-danger">
          The client is restricted. Resolve account access before reviewing this property.
        </p>
      ) : null}
      <DetailTabs
        tabs={tabs}
        active={tab}
        basePath={`/admin/properties/${id}`}
        params={{ from: back, ...(query?.revision ? { revision: query.revision } : {}) }}
      />
      {tab === 'submission' && snap ? (
        <div className="mt-5 space-y-5">
          <SectionCard
            title={`Submitted revision · pass ${selected.passNumber}`}
            description={`Captured ${new Date(selected.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. These are submitted values, not a live editor.`}
          >
            <FieldGrid
              fields={Object.entries({
                title: listing.title,
                category: snap.place?.category,
                city: snap.place?.city,
                area: snap.place?.area,
                exactAddress: listing.exactAddress,
                location:
                  listing.location?.x != null
                    ? `${listing.location.y}, ${listing.location.x} (lat, lng)`
                    : listing.location,
                capacity: listing.capacity,
                bedrooms: listing.bedrooms,
                farmSize: listing.farmSize,
                farmSizeUnit: listing.farmSizeUnit,
                checkInFrom: listing.checkInFrom,
                checkOutBy: listing.checkOutBy,
                cancellationTier: listing.cancellationTier,
                depositAmount: listing.depositAmount,
                extraGuestCharge: listing.extraGuestCharge,
              }).map(([label, value]) => ({
                label: label.replace(/([A-Z])/g, ' $1'),
                value: display(value),
              }))}
            />
            <h3 className="mt-4 font-semibold">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-meta">{listing.description}</p>
            <h3 className="mt-4 font-semibold">House rules</h3>
            <p className="mt-2 whitespace-pre-wrap text-meta">{display(listing.houseRules)}</p>
          </SectionCard>
          {base ? (
            <SectionCard
              title={`Changes since pass ${base.passNumber}${base.id === published?.id ? ' (published)' : ''}`}
              description="Field-level comparison of the two immutable submitted revisions."
            >
              {changes.length ? (
                <div
                  className="relative overflow-x-auto"
                  tabIndex={0}
                  role="region"
                  aria-label="Revision changes"
                >
                  <table className="w-full min-w-[520px] text-left text-meta">
                    <thead className="text-tiny uppercase text-ink-500">
                      <tr>
                        <th scope="col" className="py-2 pr-3">
                          Field
                        </th>
                        <th scope="col" className="py-2 pr-3">
                          Pass {base.passNumber}
                        </th>
                        <th scope="col" className="py-2">
                          Pass {selected.passNumber}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((row) => (
                        <tr key={row.label} className="border-t border-border align-top">
                          <th scope="row" className="py-2 pr-3 font-semibold">
                            {row.label}
                          </th>
                          <td className="max-w-xs break-words py-2 pr-3 text-ink-600">
                            {row.before}
                          </td>
                          <td className="max-w-xs break-words py-2">{row.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-meta">No submitted content changed between these revisions.</p>
              )}
            </SectionCard>
          ) : null}
          <SectionCard title="Photos">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, i) => (
                <a
                  key={i}
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-md border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
            {!photos.length ? (
              <p className="text-meta">Photo previews are unavailable for this snapshot.</p>
            ) : null}
          </SectionCard>
          <SectionCard title="Amenities & prices">
            <ul className="space-y-2 text-meta">
              {snap.amenities.map((a) => (
                <li key={a.amenityId}>
                  {a.labelEn}
                  {a.value ? `: ${a.value}` : ''}
                </li>
              ))}
            </ul>
            <ul className="mt-4 space-y-2 text-meta">
              {snap.prices.map((p) => (
                <li key={p.slot}>
                  {p.slot.replaceAll('_', ' ')} · Weekday ₹{p.weekday} · Weekend ₹{p.weekend}
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard
            title="Ownership evidence"
            description="Documents are private. Replaced evidence cannot be opened as if it were the original submitted file."
          >
            <ul className="space-y-3 text-meta">
              {snap.documents.map((doc) => (
                <li key={doc.id}>
                  {doc.docType.replaceAll('_', ' ')} · {doc.status} ·{' '}
                  {doc.nameOnDocument ?? 'Name not provided'}
                  {!data.stale &&
                  selected.id === current?.id &&
                  admin.capabilities.includes('admin.documents.read') ? (
                    <Link
                      className="ml-3 underline"
                      href={`/admin/documents/${doc.id}`}
                      target="_blank"
                    >
                      Open private document
                    </Link>
                  ) : (
                    <span className="ml-3 text-ink-500">
                      Historical or changed evidence: preview unavailable
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      ) : tab === 'submission' ? (
        <p className="mt-5 text-meta">
          This property predates versioned submissions. The client must resubmit before review.
        </p>
      ) : null}
      {tab === 'decision' ? (
        <SectionCard
          title="Readiness and review"
          description="No email or SMS delivery is implied; the client sees this decision in their workspace."
        >
          <ul className="grid gap-2 text-meta sm:grid-cols-2">
            {data.readiness?.sections.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                {s.done ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-brand-700"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                )}
                <span>
                  <span className="font-semibold">{s.label}</span>
                  <span className="sr-only">{s.done ? ': complete' : ': needs attention'}</span>
                  {s.note ? <span className="block text-tiny text-ink-600">{s.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-meta">Assigned reviewer: {current?.reviewer ?? 'Unassigned'}</p>
          {current && data.property.status === 'pending_review' ? (
            <PropertyReviewForm
              key={current.id}
              id={id}
              submissionId={current.id}
              assignedTo={current.assignedTo}
              adminId={admin.id}
              canDecide={canDecide}
              writable={admin.capabilities.includes('admin.properties.write')}
            />
          ) : (
            <p className="mt-4 text-meta">There is no pending submission to decide.</p>
          )}
        </SectionCard>
      ) : null}
      {tab === 'verification' ? (
        <div className="mt-5 space-y-5">
          <SectionCard
            title="Publication readiness"
            description="Only a passed verification of the exact submitted revision can publish it. There is no waiver."
          >
            {data.property.status === 'live' ? (
              <p role="status" className="rounded-md bg-success-bg p-3 text-meta text-brand-900">
                Published {ist(data.publication.publishedAt)} IST.{' '}
                {data.property.publicCode ? (
                  <Link
                    href={listingPath(data.property.slug, data.property.publicCode)}
                    target="_blank"
                    className="font-semibold underline"
                  >
                    Open public page
                  </Link>
                ) : null}
              </p>
            ) : data.publication.eligible ? (
              <p className="flex items-center gap-2 text-meta font-semibold text-brand-800">
                <CheckCircle2 className="size-4" aria-hidden="true" /> Ready to publish
              </p>
            ) : (
              <ul className="space-y-1.5 text-meta" aria-label="Publication blockers">
                {data.publication.blockers.map((blocker) => (
                  <li key={blocker} className="flex items-start gap-2">
                    <CircleAlert
                      className="mt-0.5 size-4 shrink-0 text-danger"
                      aria-hidden="true"
                    />
                    {blocker}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-meta text-ink-600">{data.publication.inventory.note}</p>
          </SectionCard>
          <SectionCard title="Verification">
            <VerificationPanel
              id={id}
              data={data}
              writable={admin.capabilities.includes('admin.properties.write')}
            />
            {!data.verifications.some((v) => v.status === 'scheduled') &&
            data.property.status !== 'pending_verification' ? (
              <p className="text-meta text-ink-600">
                Verification is scheduled after the submission is approved for verification.
              </p>
            ) : null}
          </SectionCard>
          <SectionCard title="Verification history">
            <ul className="space-y-4">
              {data.verifications.map((v) => (
                <li key={v.id} className="text-meta">
                  <strong>
                    {VISIT_MODE[v.mode]} · {ist(v.scheduledAt)} IST ·{' '}
                    {v.status === 'completed' ? v.outcome.replaceAll('_', ' ') : v.status}
                  </strong>
                  <p className="mt-1 text-ink-600">
                    {v.submissionId === data.publication.submissionId
                      ? 'Current revision'
                      : 'Earlier revision'}
                    {v.recordedBy ? ` · recorded by ${v.recordedBy} ${ist(v.completedAt)} IST` : ''}
                    {v.cancelReason ? ` · ${v.cancelReason}` : ''}
                  </p>
                  {v.report?.findings ? (
                    <p className="mt-1 whitespace-pre-wrap">{v.report.findings}</p>
                  ) : null}
                  {v.geo ? (
                    <p className="mt-1 text-ink-600">
                      On-site at {v.geo.lat}, {v.geo.lng}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            {!data.verifications.length ? (
              <p className="text-meta">No verification scheduled yet.</p>
            ) : null}
          </SectionCard>
        </div>
      ) : null}
      {tab === 'visibility' ? (
        <div className="mt-5 space-y-5">
          <SectionCard
            title="Current visibility"
            description="Owner pause and a Rentra restriction are separate: the client cannot resume or undo a restriction."
          >
            <FieldGrid
              fields={[
                { label: 'Status', value: statusLabel(data.lifecycle.status) },
                {
                  label: 'Public page',
                  value: data.lifecycle.publiclyVisible ? 'Visible in search' : 'Not visible',
                },
                { label: 'Status before', value: statusLabel(data.lifecycle.priorStatus) },
                {
                  label: 'Upcoming confirmed visits',
                  value: String(data.lifecycle.upcomingVisits),
                },
                { label: 'Checkouts in progress', value: String(data.lifecycle.activeHolds) },
                { label: 'State version', value: String(data.lifecycle.version) },
              ]}
            />
            {data.lifecycle.restriction ? (
              <p role="status" className="mt-4 rounded-md bg-danger-bg p-3 text-meta text-danger">
                Hidden by {data.lifecycle.restriction.by ?? 'Rentra'} on{' '}
                {ist(data.lifecycle.restriction.at)} IST: {data.lifecycle.restriction.reason}
              </p>
            ) : null}
            {data.lifecycle.visits.length ? (
              <ul className="mt-4 space-y-1 text-meta" aria-label="Upcoming confirmed visits">
                {data.lifecycle.visits.map((v) => (
                  <li key={v.reference}>
                    {v.reference} · {v.day} · {v.slot.replaceAll('_', ' ')} · {v.state}
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>
          <SectionCard title="Visibility and correction commands">
            <PropertyLifecyclePanel
              id={id}
              lifecycle={data.lifecycle}
              writable={admin.capabilities.includes('admin.properties.write')}
            />
          </SectionCard>
        </div>
      ) : null}
      {tab === 'history' ? (
        <div className="mt-5 space-y-5">
          <SectionCard title="Submitted revisions">
            <ul className="space-y-3 text-meta">
              {data.submissions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/admin/properties/${id}?revision=${s.id}&from=${encodeURIComponent(back)}`}
                    className="underline"
                  >
                    Pass {s.passNumber} · content version {s.contentVersion}
                  </Link>{' '}
                  · {new Date(s.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
                  IST
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard
            title="Activity"
            description="Every recorded lifecycle event, newest first: client, reviewer and system actions."
          >
            <ol className="space-y-3">
              {data.activity.map((a) => (
                <li key={a.id} className="border-l-2 border-border pl-3 text-meta">
                  <strong>{ACTION_LABEL[a.action] ?? a.action.replaceAll('_', ' ')}</strong>
                  {a.before?.status || a.after?.status ? (
                    <span className="text-ink-600">
                      {' '}
                      · {statusLabel(a.before?.status)} → {statusLabel(a.after?.status)}
                    </span>
                  ) : null}
                  <p className="text-tiny text-ink-500">
                    {a.actor ?? a.actorType} · {ist(a.at)} IST
                  </p>
                  {a.action === 'listing_corrected' ? (
                    <p className="text-tiny text-ink-600">
                      Changed: {Object.keys(a.after ?? {}).join(', ')}
                    </p>
                  ) : null}
                  {a.reason ? <p className="mt-1 whitespace-pre-wrap">{a.reason}</p> : null}
                </li>
              ))}
            </ol>
            {!data.activity.length ? <p className="text-meta">No activity recorded yet.</p> : null}
          </SectionCard>
          <SectionCard title="Decision history">
            <ul className="space-y-4">
              {data.history.map((h) => (
                <li key={h.id} className="text-meta">
                  <strong>
                    Pass {h.passNumber} · {h.outcome.replaceAll('_', ' ')}
                  </strong>
                  <p className="mt-1 whitespace-pre-wrap">{h.reason}</p>
                  <p className="mt-1 text-ink-600">
                    {h.reviewer ?? 'Previous reviewer'} ·{' '}
                    {new Date(h.reviewedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
                    IST
                  </p>
                  {h.flaggedFields?.length ? (
                    <p>Corrections: {h.flaggedFields.join(', ')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            {!data.history.length ? <p className="text-meta">No decisions recorded yet.</p> : null}
          </SectionCard>
        </div>
      ) : null}
    </AdminPage>
  );
}
