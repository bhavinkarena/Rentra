import { supportRecordPage } from '@/lib/support/page';
import { SupportDetail } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Support request', robots: { index: false, follow: false } };
export default async function Page({ params }) { return <SupportDetail admin record={await supportRecordPage('admin', (await params).id)}/>; }
