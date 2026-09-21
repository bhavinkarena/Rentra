import { adminApi } from '@/lib/api/endpoints';
import { SupportDetail } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Support request', robots: { index: false, follow: false } };
export default async function Page({ params }) { return <SupportDetail admin record={await adminApi.supportThread((await params).id)}/>; }
