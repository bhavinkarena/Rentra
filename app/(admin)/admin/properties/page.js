import Link from 'next/link';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import {
  AdminPage,
  AdminPageHeader,
  AdminEmpty,
  Pager,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';

const statuses = ['pending_review', 'pending_verification', 'draft', 'rejected', 'all'];
export default async function PropertyReviewQueue({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const { data, failure } = await settle(
    adminApi.properties({
      status: params?.status,
      assignee: params?.assignee,
      q: params?.q,
      page: params?.page,
    }),
  );
  if (failure) return <PortalState kind={failure} />;
  const link = (change) => {
    const next = {
      status: data.status,
      assignee: data.assignee,
      q: data.q,
      page: data.page,
      ...change,
    };
    const query = new URLSearchParams();
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
        eyebrow="Gate 2"
        title="Property review"
        description="Inspect a submitted revision, request corrections, or move it to verification. Publication follows in the verification workflow."
      />
      <div className="mt-6 space-y-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {statuses.map((key) => (
            <Link
              key={key}
              href={link({ status: key, page: 1 })}
              aria-current={data.status === key ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-tiny font-semibold capitalize ${
                data.status === key
                  ? 'border-brand-700 bg-brand-700 text-white'
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
          <form className="flex items-end gap-2" action="/admin/properties" role="search">
            <input type="hidden" name="status" value={data.status} />
            <input type="hidden" name="assignee" value={data.assignee} />
            <label className="text-tiny font-semibold text-ink-600">
              Title, reference or client email
              <input
                name="q"
                defaultValue={data.q}
                maxLength={100}
                className="mt-1 block min-h-10 w-60 max-w-full rounded-md border border-border bg-white px-3 text-meta"
              />
            </label>
            <button className="min-h-10 rounded-md bg-brand-700 px-4 text-tiny font-semibold text-white">
              Search
            </button>
          </form>
        </div>
      </div>
      <p className="mt-5 mb-3 text-meta text-ink-600">
        {data.total} {data.total === 1 ? 'property' : 'properties'} · Page {data.page} of{' '}
        {data.pages}
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {data.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <Link
                className="text-h4 font-semibold text-brand-800 underline-offset-4 hover:underline"
                href={`/admin/properties/${item.id}?from=${encodeURIComponent(href(data.page))}`}
              >
                {item.title}
              </Link>
              <p className="mt-1 break-all text-meta text-ink-600">
                {item.email} · {item.publicCode}
              </p>
              <p className="mt-2 text-tiny text-ink-500">
                {item.submittedAt
                  ? `Submitted ${new Date(item.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
                  : 'Awaiting a versioned submission'}{' '}
                · {item.reviewer ?? 'Unassigned'}
              </p>
              {(!item.submissionId || item.contentVersion !== item.submittedVersion) &&
              item.status === 'pending_review' ? (
                <p className="mt-2 text-meta text-amber-800">
                  Client must submit the current revision before a decision.
                </p>
              ) : null}
              {item.accountStatus !== 'active' ? (
                <p className="text-meta text-danger">Client access is restricted</p>
              ) : null}
            </div>
            <StatusBadge
              tone={
                item.status === 'pending_review'
                  ? 'warning'
                  : item.status === 'rejected'
                    ? 'danger'
                    : item.status === 'pending_verification'
                      ? 'info'
                      : 'neutral'
              }
            >
              {item.status.replaceAll('_', ' ')}
            </StatusBadge>
          </li>
        ))}
      </ul>
      {!data.items.length ? (
        <AdminEmpty
          title="No properties match these filters"
          description="Try another status or clear the search."
        />
      ) : null}
      <div className="mt-5">
        <Pager
          page={data.page}
          hasNext={data.page < data.pages}
          previousHref={href(data.page - 1)}
          nextHref={href(data.page + 1)}
        />
      </div>
    </AdminPage>
  );
}
