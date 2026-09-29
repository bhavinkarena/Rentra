import Link from '@/components/navigation/NavigationLink';
import { randomUUID } from 'node:crypto';
import { notFound } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { OpenSupportForm } from '@/components/customer/SupportForms';
import { PageHeader } from '@/components/ui/page-header';
import { CalendarDays, Info } from 'lucide-react';
export const metadata = { title: 'New support request', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const query = await searchParams;
  let record = null,
    privacy = null;
  if (query.order) {
    try {
      record = await customerApi.record(query.order);
    } catch (error) {
      /* A booking that is not this customer's reads as absent, not forbidden. */
      if (error instanceof ApiError && [403, 404].includes(error.status)) notFound();
      throw error;
    }
  }
  if (query.privacy) {
    const account = await customerApi.account();
    privacy = account.requests.find((p) => p.id === query.privacy);
    if (!privacy || record) notFound();
  }
  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        className="mb-2"
        back={{ href: '/support', label: 'Support requests' }}
        title="New support request"
        description="Your request is sent only when it has been saved. Check its conversation for replies; this is not live chat."
      />
      {record ? (
        <p className="flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-meta text-ink-800">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
          <span className="min-w-0 wrap-break-word">
            Booking {record.reference} · {record.title}. Sending a request does not cancel or change
            this booking.
          </span>
        </p>
      ) : privacy ? (
        <p className="rounded-lg bg-brand-50 p-4 text-meta text-ink-800">
          Linked to your {privacy.kind === 'access' ? 'account data copy' : 'account deletion'}{' '}
          request. This conversation does not fulfill it.
        </p>
      ) : (
        <p className="flex items-start gap-3 rounded-lg bg-info-bg p-4 text-meta text-ink-800">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <span>
            For a booking issue,{' '}
            <Link className="text-brand-700 underline" href="/bookings">
              open your booking and choose Get booking help
            </Link>{' '}
            to attach its details. For a data request, use{' '}
            <Link className="text-brand-700 underline" href="/account/privacy">
              Privacy and account requests
            </Link>
            .
          </span>
        </p>
      )}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <OpenSupportForm
          requestKey={randomUUID()}
          orderId={record?.id}
          privacyRequestId={privacy?.id}
          category={
            privacy
              ? 'privacy'
              : typeof query.topic === 'string'
                ? query.topic
                : record
                  ? 'booking'
                  : 'other'
          }
        />
      </div>
    </section>
  );
}
