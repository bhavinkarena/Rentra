import Image from 'next/image';
import { House } from 'lucide-react';
import { adminDateTime } from '@/lib/domain/admin-display';
import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import {
  AdminPage,
  AdminPageHeader,
  AdminEmpty,
  AdminTable,
  AdminFilterBar,
  AdminKpiCard,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import Pagination from '@/components/ui/pagination';

const statuses = [
  'pending_review',
  'pending_verification',
  'live',
  'paused',
  'hidden',
  'draft',
  'rejected',
  'all',
];
export default async function PropertyReviewQueue({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const { data, failure } = await settle(
    adminApi.properties({
      status: params?.status,
      submitted: params?.submitted,
      assignee: params?.assignee,
      q: params?.q,
      page: params?.page,
    }),
  );
  if (failure) return <PortalState kind={failure} />;
  const link = (change) => {
    const next = {
      status: data.status,
      submitted: params?.submitted,
      assignee: data.assignee,
      q: data.q,
      page: data.page,
      ...change,
    };
    const query = new URLSearchParams();
    if (next.submitted) query.set('submitted', next.submitted);
    if (next.status !== 'pending_review') query.set('status', next.status);
    if (next.assignee !== 'any') query.set('assignee', next.assignee);
    if (next.q) query.set('q', next.q);
    if (next.page > 1) query.set('page', String(next.page));
    return query.size ? `/admin/properties?${query}` : '/admin/properties';
  };
  const href = (page) => link({ page });
  return (
    <AdminPage>
      <AdminPageHeader
        title="Property review"
        description="Inspect a submitted revision, request corrections, or move it to verification. Publication follows in the verification workflow."
      />
      <section aria-label="Property queue totals" className="mt-6 grid gap-3 sm:grid-cols-3">
        <AdminKpiCard
          label="Submitted for review"
          value={data.counts.waiting}
          hint="Matching search and reviewer; across status filters"
        />
        <AdminKpiCard
          label="Unassigned reviews"
          value={data.counts.unassigned}
          hint="Current submitted review passes in this scope"
        />
        <AdminKpiCard
          label="Awaiting verification"
          value={data.counts.verification}
          hint="Verification or publication still required"
        />
      </section>
      <AdminFilterBar label="Property filters" className="mt-6 rounded-lg border border-border">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {statuses.map((key) => (
            <Link
              key={key}
              href={link({ status: key, page: 1 })}
              aria-current={data.status === key ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-tiny font-semibold capitalize ${
                data.status === key
                  ? 'border-brand-700 bg-primary text-white'
                  : 'border-border bg-card text-ink-700 hover:bg-ink-50'
              }`}
            >
              {key === 'pending_review' ? 'Waiting for review' : key.replaceAll('_', ' ')}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <nav aria-label="Filter by reviewer" className="flex flex-wrap gap-2">
            {[
              ['any', 'Anyone'],
              ['me', 'Assigned to me'],
              ['unassigned', 'Unassigned'],
            ].map(([key, text]) => (
              <Link
                key={key}
                href={link({ assignee: key, page: 1 })}
                aria-current={data.assignee === key ? 'page' : undefined}
                className={`inline-flex min-h-9 items-center rounded-md border px-3 text-tiny font-semibold ${
                  data.assignee === key
                    ? 'border-ink-800 bg-ink-800 text-white'
                    : 'border-border bg-card text-ink-700 hover:bg-ink-50'
                }`}
              >
                {text}
              </Link>
            ))}
          </nav>
          <Form
            className="flex w-full max-w-xl items-end gap-2"
            action="/admin/properties"
            role="search"
          >
            <input type="hidden" name="status" value={data.status} />
            {params?.submitted === '1' ? <input type="hidden" name="submitted" value="1" /> : null}
            <input type="hidden" name="assignee" value={data.assignee} />
            <label className="min-w-0 flex-1 text-tiny font-semibold text-ink-600">
              Property name, reference or owner email
              <input
                name="q"
                defaultValue={data.q}
                maxLength={100}
                className="mt-1 block min-h-10 w-full rounded-md border border-input bg-card px-3 text-base md:text-sm"
              />
            </label>
            <button className="min-h-10 rounded-md bg-primary px-4 text-tiny font-semibold text-white">
              Search
            </button>
          </Form>
        </div>
      </AdminFilterBar>
      <p className="mt-5 mb-3 text-meta text-ink-600">
        {data.total} {data.total === 1 ? 'property' : 'properties'} · Page {data.page} of{' '}
        {data.pages}
      </p>
      <AdminTable
        label="Property reviews"
        columns={['Property', 'Owner', 'Submission', 'Verification', 'Reviewer', 'Review']}
        minWidth={1080}
        empty={
          !data.items.length ? (
            <AdminEmpty
              title="No properties match these filters"
              description="Try another status, reviewer or search."
            />
          ) : null
        }
      >
        {data.items.map((item) => {
          const detail = `/admin/properties/${item.id}?from=${encodeURIComponent(href(data.page))}`;
          const stale = !item.submissionId || item.contentVersion !== item.submittedVersion;
          return (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.photos[0] ? (
                    <Image
                      src={item.photos[0].url}
                      width={56}
                      height={56}
                      unoptimized
                      alt=""
                      className="size-14 rounded-md object-cover"
                    />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-md bg-ink-50">
                      <House className="size-5 text-ink-500" aria-hidden="true" />
                    </span>
                  )}
                  <div>
                    <Link
                      className="inline-flex min-h-11 items-center font-semibold text-brand-700"
                      href={detail}
                    >
                      {item.title}
                    </Link>
                    <p className="text-tiny text-ink-600">{item.publicCode}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold">{item.ownerName}</p>
                <p className="text-tiny text-ink-600">{item.email}</p>
                {item.accountStatus !== 'active' ? (
                  <p className="text-tiny text-danger">Owner access restricted</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge domain="property" state={item.status} />
                <p className="mt-2 text-tiny text-ink-600">
                  {item.submissionId
                    ? `Pass ${item.reviewPass} / content version ${item.submittedVersion}`
                    : 'No submitted revision'}
                </p>
                {item.submittedAt ? (
                  <p className="text-tiny text-ink-600">{adminDateTime(item.submittedAt)}</p>
                ) : null}
                {stale ? (
                  <p className="text-tiny text-warning">Current changes need submission</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-meta">
                {item.verificationScheduled
                  ? 'Scheduled'
                  : item.verificationOutcome
                    ? `Recorded: ${item.verificationOutcome.replaceAll('_', ' ')}`
                    : item.status === 'live'
                      ? 'Published; inspect recorded evidence'
                      : item.status === 'pending_verification'
                        ? 'Not yet scheduled'
                        : 'Review required before verification'}
                <p className="mt-1 text-tiny text-ink-600">
                  Open the record for publication prerequisites.
                </p>
              </td>
              <td className="px-4 py-3">{item.reviewer ?? 'Unassigned'}</td>
              <td className="px-4 py-3">
                <Link
                  href={detail}
                  aria-label={`Review property ${item.title}`}
                  className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Review
                </Link>
              </td>
            </tr>
          );
        })}
      </AdminTable>
      <Pagination
        page={data.page}
        pageSize={20}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Property pages"
        noun="properties"
        className="mt-5"
      />
    </AdminPage>
  );
}
