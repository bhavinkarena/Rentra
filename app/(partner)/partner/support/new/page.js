import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { requireClient } from '@/lib/api/session';
import { OpenSupportForm } from '@/components/customer/SupportForms';
export const metadata = {
  title: 'New support request',
  robots: { index: false, follow: false },
};
export default async function Page({ searchParams }) {
  const user = await requireClient();
  const pendingOwner = user.accountStatus !== 'active';
  const query = await searchParams;
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <Link className="inline-flex min-h-11 items-center underline" href="/partner/support">
        Back to support
      </Link>
      <h1 className="text-h1">Contact Rentra support</h1>
      <p>
        This conversation is private to your owner account and Rentra support. Return here for
        replies; this is not live chat.
      </p>
      <OpenSupportForm
        owner
        pendingOwner={pendingOwner}
        requestKey={randomUUID()}
        orderId={pendingOwner ? '' : query.orderId || ''}
        propertyId={pendingOwner ? '' : query.propertyId || ''}
        category={query.orderId ? 'booking' : 'other'}
      />
    </section>
  );
}
