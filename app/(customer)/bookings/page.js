import Link from 'next/link';
import { customerPageAccount } from '@/lib/customer/page';
export const metadata={title:'Bookings'};
export default async function BookingsPage() {
  await customerPageAccount();
  return <div className="space-y-5"><h1 className="text-h1">Your bookings</h1><p className="text-body text-ink-600">Online booking has not opened yet, so there is no booking history here. Checking dates and prices does not reserve a place.</p><Link href="/saved" className="inline-flex min-h-11 items-center text-brand-700 underline">View saved places</Link></div>;
}
