import { adminApi } from '@/lib/api/endpoints';
import { AdminSupportDetail } from '@/components/admin/AdminSupport';
export const metadata = { title: 'Support request', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  return <AdminSupportDetail record={await adminApi.supportThread((await params).id)} />;
}
