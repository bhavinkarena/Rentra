import Link from 'next/link';
import { customerPageAccount } from '@/lib/customer/page';
export const metadata={title:'Bookings'};
export default async function BookingsPage() {
  await customerPageAccount();
  return <div className="space-y-5"><h1 className="text-h1">Your bookings</h1><p className="text-body text-ink-600">Online booking and account booking history are not available yet. Exploring dates or requesting a quote does not reserve a property.</p><Link href="/" className="inline-flex min-h-11 items-center text-brand-700 underline">Explore places</Link></div>;
}
