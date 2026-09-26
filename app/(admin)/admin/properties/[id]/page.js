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
import { normalizePublicPhotos } from '@/lib/domain/listing-content';

const tabs = [
  { key: 'submission', label: 'Submitted property' },
  { key: 'decision', label: 'Review & decision' },
  { key: 'history', label: 'History' },
];
const STATUS_TONE = {
  pending_review: 'warning',
  pending_verification: 'info',
  live: 'success',
  rejected: 'danger',
  draft: 'neutral',
};
const ist = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
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
            label: data.property.status.replaceAll('_', ' '),
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
