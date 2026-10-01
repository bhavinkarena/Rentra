import { redirect } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { BookAgainForm } from '@/components/customer/VisitLifecycle';
import { PageHeader } from '@/components/ui/page-header';
export const metadata = { title: 'Book again', robots: { index: false, follow: false } };
export default async function BookAgainPage({ params }) {
  const record = await customerApi.record((await params).orderId);
  // A court booking is rebooked by picking a fresh time on the venue page.
  if (record.rebookHref) redirect(record.rebookHref);
  return (
    <section className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: `/bookings/${record.id}`, label: 'Back to booking' }}
        title={`Book ${record.title} again`}
      />
      <BookAgainForm
        record={{
          id: record.id,
          visits: record.visits.map((v) => ({ slot: v.slot, guests: v.guests })),
        }}
      />
    </section>
  );
}
