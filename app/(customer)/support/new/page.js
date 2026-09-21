import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { notFound } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { OpenSupportForm } from '@/components/customer/SupportForms';
export const metadata = { title: 'New support request', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const query = await searchParams;
  let record = null, privacy = null;
  if (query.order) {
    try { record = await customerApi.record(query.order); }
    catch (error) {
      /* A booking that is not this customer's reads as absent, not forbidden. */
      if (error instanceof ApiError && [403, 404].includes(error.status)) notFound();
      throw error;
    }
  }
  if (query.privacy) {
    const account = await customerApi.account();
    privacy = account.requests.find(p => p.id === query.privacy);
    if (!privacy || record) notFound();
  }
  return <section className="space-y-5"><h1 className="text-h1">New support request</h1><p>Your request is sent only when it has been saved. Check its conversation for replies; this is not live chat.</p>
    {record ? <p>Booking {record.reference} · {record.title}. Sending a request does not cancel or change this booking.</p> : privacy ? <p>Linked to your {privacy.kind === 'access' ? 'account data copy' : 'account deletion'} request. This conversation does not fulfill it.</p> : <p>For a booking issue, <Link className="text-brand-700 underline" href="/bookings">open your booking and choose Get booking help</Link> to attach its details. For a data request, use <Link className="text-brand-700 underline" href="/account/privacy">Privacy and account requests</Link>.</p>}
    <OpenSupportForm requestKey={randomUUID()} orderId={record?.id} privacyRequestId={privacy?.id} category={privacy ? 'privacy' : typeof query.topic === 'string' ? query.topic : record ? 'booking' : 'other'}/>
  </section>;
}
