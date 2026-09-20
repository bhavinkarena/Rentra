import Link from 'next/link';
import { customerPageAccount } from '@/lib/customer/page';
import { recentCustomerCheckouts } from '@/lib/booking/checkout-review';
import { getSession } from '@/lib/auth/dal';
import { sql } from '@/lib/db';
export const metadata={title:'Bookings'};
export default async function BookingsPage() {
  await customerPageAccount();
  const checkouts = await recentCustomerCheckouts(sql, await getSession());
  return <div className="space-y-5"><h1 className="text-h1">Your bookings</h1><p className="text-body text-ink-600">Recover a recent Test checkout below. Detailed visit history and arrival information will be available in a later release.</p><ul className="space-y-3">{checkouts.map(item => <li key={item.id}><Link className="block min-h-11 rounded-md border border-border p-4 text-brand-700 underline" href={`/checkout/${item.id}`}>{item.title}<span className="block break-all text-meta">{item.reference}</span></Link></li>)}</ul>{!checkouts.length ? <p>No Test checkouts yet.</p> : null}<Link href="/saved" className="inline-flex min-h-11 items-center text-brand-700 underline">View saved places</Link></div>;
}
