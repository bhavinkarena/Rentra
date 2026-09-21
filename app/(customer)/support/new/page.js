import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { notFound } from 'next/navigation';
import { bookingActor } from '@/lib/booking/record-page';
import { readBookingRecord } from '@/lib/booking/records';
import { readCustomerAccount } from '@/lib/customer/account';
import { sql } from '@/lib/db';
import { OpenSupportForm } from '@/components/customer/SupportForms';
export const metadata = { title: 'New support request', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const actor = await bookingActor('customer'), query = await searchParams;
  let record = null, privacy = null;
  if (query.order) { try { record = await readBookingRecord(sql, actor, query.order); } catch (error) { if (error.code === 'BOOKING_NOT_FOUND') notFound(); throw error; } }
  if (query.privacy) { const account = await readCustomerAccount(sql, actor.session); privacy = account.requests.find(p => p.id === query.privacy); if (!privacy || record) notFound(); }
  return <section className="space-y-5"><h1 className="text-h1">New support request</h1><p>Your request is sent only when it has been saved. Check its conversation for replies; this is not live chat.</p>
    {record ? <p>Booking {record.reference} · {record.title}. Sending a request does not cancel or change this booking.</p> : privacy ? <p>Linked to your {privacy.kind === 'access' ? 'account data copy' : 'account deletion'} request. This conversation does not fulfill it.</p> : <p>For a booking issue, <Link className="text-brand-700 underline" href="/bookings">open your booking and choose Get booking help</Link> to attach its details. For a data request, use <Link className="text-brand-700 underline" href="/account/privacy">Privacy and account requests</Link>.</p>}
    <OpenSupportForm requestKey={randomUUID()} orderId={record?.id} privacyRequestId={privacy?.id} category={privacy ? 'privacy' : typeof query.topic === 'string' ? query.topic : record ? 'booking' : 'other'}/>
  </section>;
}
