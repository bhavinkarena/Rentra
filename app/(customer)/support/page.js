import { customerApi } from '@/lib/api/endpoints';
import { SupportList } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Your support requests', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) { return <SupportList data={await customerApi.support(await searchParams)}/>; }
