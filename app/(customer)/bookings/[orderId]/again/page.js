import { bookingRecordPage } from '@/lib/booking/record-page';
import { BookAgainForm } from '@/components/customer/VisitLifecycle';
export const metadata = { title: 'Book again', robots: { index: false, follow: false } };
export default async function BookAgainPage({ params }) {
  const record = await bookingRecordPage('customer', (await params).orderId);
  return <section className="space-y-5 p-4"><h1 className="text-h1">Book {record.title} again</h1><BookAgainForm record={{ id: record.id, visits: record.visits.map(v => ({ slot: v.slot, guests: v.guests })) }}/></section>;
}
