import { adminApi } from '@/lib/api/endpoints';
import { SupportList } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Support inbox', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) { return <SupportList admin data={await adminApi.support(await searchParams)}/>; }
