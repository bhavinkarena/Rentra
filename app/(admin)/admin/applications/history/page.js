import Link from '@/components/navigation/NavigationLink';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AdminPage, AdminPageHeader, AdminTable, Pager } from '@/components/admin/AdminPrimitives';
import { adminDateTime } from '@/lib/domain/admin-display';
import { humaniseStatus } from '@/lib/domain/status';

export const metadata = {
  title: 'Application decision history',
  robots: { index: false, follow: false },
};
export default async function DecisionHistory({ searchParams }) {
  const admin = await requireAdmin();
  if (!admin.capabilities?.includes('admin.applications.read'))
    return <PortalState kind="forbidden" backHref="/admin" />;
  const query = await searchParams;
  const { data, failure } = await settle(adminApi.decisionHistory(query));
  if (failure) return <PortalState kind={failure} backHref="/admin" />;
  const href = (page) =>
    `/admin/applications/history?${new URLSearchParams({ from: data.from, to: data.to, page: String(page) })}`;
  return (
    <AdminPage>
      <AdminPageHeader
        title="Application decision history"
        description={`Approval, rejection and more-information events from ${data.from} to ${data.to} (IST).`}
        backHref="/admin"
        backLabel="Dashboard"
      />
      <p className="my-4 text-meta text-ink-600">
        {data.total} recorded decisions. An application can have multiple decisions.
      </p>
      <AdminTable
        label="Application decision history"
        columns={['Application', 'Decision', 'At (IST)']}
        minWidth={560}
        empty={!data.items.length ? 'No decisions in this period.' : null}
      >
        {data.items.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              {row.application_id ? (
                <Link
                  href={`/admin/applications/${row.application_id}`}
                  className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
                >
                  {row.label || 'Owner application'}
                </Link>
              ) : (
                'Application no longer available'
              )}
            </td>
            <td className="px-4 py-3">{humaniseStatus(row.action.replace('application_', ''))}</td>
            <td className="px-4 py-3">{adminDateTime(row.at)}</td>
          </tr>
        ))}
      </AdminTable>
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
