import { randomUUID } from 'node:crypto';
import { BackLink } from '@/components/ui/page-header';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { requireClient } from '@/lib/api/session';
import ContactOptions from '@/components/partner/help/ContactOptions';
import SupportForm from '@/components/partner/help/SupportForm';
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
    <section className="space-y-5">
      <BackLink href="/partner/support">My requests</BackLink>
      <h1 className="text-h1 font-bold tracking-[-0.03em]">Contact support</h1>
      <p className="max-w-[65ch] text-meta leading-6 text-ink-600">
        This conversation is private to your owner account and Rentra support. Return here for
        replies; this is not live chat.
      </p>
      {context.data && (
        <p className="rounded-lg border p-4">
          {context.data.reference} · {context.data.title}
          {visit ? ` · Visit ${visit.reference} on ${visit.date}` : ''}
        </p>
      )}
      <div className="grid gap-9 pt-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-7">
          <h2 className="mb-6 text-h3 font-semibold">Send a request</h2>
          <SupportForm
            pendingOwner={pendingOwner}
            requestKey={randomUUID()}
            orderId={pendingOwner ? '' : query.orderId || ''}
            visitId={visit?.id || ''}
            initialSubject={context.data ? `Question about ${context.data.reference}` : ''}
            propertyId={pendingOwner ? '' : query.propertyId || ''}
            category={query.category || (query.orderId ? 'booking' : 'other')}
          />
        </div>
        <aside className="min-w-0 lg:border-l lg:border-border lg:pl-8">
          <ContactOptions />
        </aside>
      </div>
    </section>
  );
}
