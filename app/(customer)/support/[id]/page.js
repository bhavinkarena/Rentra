import { customerApi } from '@/lib/api/endpoints';
import { SupportDetail } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Support request', robots: { index: false, follow: false } };
export default async function Page({ params }) { return <SupportDetail record={await customerApi.supportThread((await params).id)}/>; }
