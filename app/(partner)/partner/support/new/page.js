import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { requireActiveClient } from '@/lib/api/session';
import { OpenSupportForm } from '@/components/customer/SupportForms';
export const metadata = {
  title: 'New client support request',
  robots: { index: false, follow: false },
};
export default async function Page({ searchParams }) {
  await requireActiveClient();
  const query = await searchParams;
  return (
    <section className="mx-auto max-w-3xl space-y-5 p-4">
      <Link className="inline-flex min-h-11 items-center underline" href="/partner/support">
        Back to support
      </Link>
      <h1 className="text-h1">Contact Rentra support</h1>
      <p>
        This conversation is private to your client account and Rentra support. Return here for
        replies; this is not live chat.
      </p>
      <OpenSupportForm
        owner
        requestKey={randomUUID()}
        orderId={query.orderId || ''}
        propertyId={query.propertyId || ''}
        category={query.orderId ? 'booking' : 'other'}
      />
    </section>
  );
}
