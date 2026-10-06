import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
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
import { Field, fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { adminDateTime } from '@/lib/domain/admin-display';

export const metadata = {
  title: 'Application decision history',
  robots: { index: false, follow: false, nocache: true },
};
export default async function DecisionHistory({ searchParams }) {
  const admin = await requireAdmin();
  if (!admin.capabilities?.includes('admin.applications.read'))
    return <PortalState kind="forbidden" backHref="/admin" />;
  const query = await searchParams;
  const { data, failure } = await settle(adminApi.decisionHistory(query));
  if (failure) return <PortalState kind={failure} backHref="/admin/applications" />;
  const href = (page) =>
    `/admin/applications/history?${new URLSearchParams({ from: data.from, to: data.to, page: String(page) })}`;
  return (
    <AdminPage>
      <AdminPageHeader
        title="Decision history"
        description="Recorded approval, rejection and more-information events."
        backHref="/admin/applications"
        backLabel="Applications"
      />
      <Form action="/admin/applications/history" className="mt-6 flex flex-wrap items-end gap-3">
        <Field id="decisions-from" label="From (IST)">
          <input
            id="decisions-from"
            name="from"
            type="date"
            defaultValue={data.from}
            className={fieldClass}
            required
          />
        </Field>
        <Field id="decisions-to" label="To (IST)">
          <input
            id="decisions-to"
            name="to"
            type="date"
            defaultValue={data.to}
            className={fieldClass}
            required
          />
        </Field>
        <button className={buttonVariants({ variant: 'outline' })}>Apply dates</button>
      </Form>
      <p className="my-5 text-meta text-ink-600">
        {data.total} recorded decisions from {data.from} to {data.to} (IST). An application can have
        multiple decisions.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {data.items.length ? (
          <ul className="divide-y divide-border">
            {data.items.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  {row.application_id ? (
                    <Link
                      href={`/admin/applications/${row.application_id}`}
                      className="inline-flex min-h-11 items-center break-words text-base font-semibold text-brand-700 hover:underline"
                    >
                      {row.label || 'Owner application'}
                    </Link>
                  ) : (
                    <p className="text-base font-semibold text-ink-900">
                      Application no longer available
                    </p>
                  )}
                  <p className="mt-1 text-meta text-ink-600">{adminDateTime(row.at)}</p>
                </div>
                <StatusBadge domain="application" state={row.action.replace('application_', '')} />
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty
            title="No decisions in this period"
            description="Choose another date range to see recorded decisions."
          />
        )}
      </div>
      <div className="mt-4">
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
