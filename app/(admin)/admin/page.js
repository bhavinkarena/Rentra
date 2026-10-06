import AdminDashboard from '@/components/admin/AdminDashboard';
import { adminApi } from '@/lib/api/endpoints';
import { redirect } from 'next/navigation';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { requireAdmin } from '@/lib/api/session';
import { legacyApplicationHref } from '@/lib/domain/admin-navigation';

export const metadata = {
  title: 'Admin workspace',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminHome({ searchParams, view = 'overview' }) {
  await requireAdmin();
  const query = await searchParams;
  const legacy = view === 'overview' ? legacyApplicationHref(query) : null;
  if (legacy) redirect(legacy);
  const { data, failure } = await settle(
    adminApi.dashboard({ period: query?.period, environment: query?.environment }),
  );
  if (failure) return <PortalState kind={failure} backHref="/admin" />;
  return <AdminDashboard data={data} view={view} />;
}
