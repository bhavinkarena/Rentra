import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { requireClient } from '@/lib/api/session';
import OwnerContactStrip from '@/components/partner/OwnerContactStrip';
import { OpenSupportForm } from '@/components/customer/SupportForms';
export const metadata = {
  title: 'New support request',
  robots: { index: false, follow: false },
};
export default async function Page({ searchParams }) {
  const user = await requireClient();
  const pendingOwner = user.accountStatus !== 'active';
  const query = await searchParams;
  const context =
    !pendingOwner && query.orderId
      ? await settle(partnerApi.record(query.orderId))
      : { data: null };
  if (context.failure) return <PortalState kind={context.failure} />;
  const visit = context.data?.visits?.find((v) => v.id === query.visitId);
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <Link className="inline-flex min-h-11 items-center underline" href="/partner/support">
        Back to support
      </Link>
      <h1 className="text-h1">Contact Rentra support</h1>
      <p>
        This conversation is private to your owner account and Rentra support. Return here for
        replies; this is not live chat.
      </p>
      {context.data && (
        <p className="rounded-lg border p-4">
          {context.data.reference} · {context.data.title}
          {visit ? ` · Visit ${visit.reference} on ${visit.date}` : ''}
        </p>
      )}
      <OwnerContactStrip />
      <OpenSupportForm
        owner
        pendingOwner={pendingOwner}
        requestKey={randomUUID()}
        orderId={pendingOwner ? '' : query.orderId || ''}
        visitId={visit?.id || ''}
        initialSubject={context.data ? `Question about ${context.data.reference}` : ''}
        propertyId={pendingOwner ? '' : query.propertyId || ''}
        category={query.category || (query.orderId ? 'booking' : 'other')}
      />
    </section>
  );
}
