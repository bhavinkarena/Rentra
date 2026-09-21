import { bookingActor } from '@/lib/booking/record-page';
import { sql } from '@/lib/db';
import { listSupportRequests } from '@/lib/support/service';
import { SupportList } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Your support requests', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) { return <SupportList data={await listSupportRequests(sql, await bookingActor('customer'), await searchParams)}/>; }
