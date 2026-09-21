import { adminApi } from '@/lib/api/endpoints';
import { AdminSupportList } from '@/components/admin/AdminSupport';
export const metadata = { title: 'Support inbox', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) { return <AdminSupportList data={await adminApi.support(await searchParams)}/>; }
