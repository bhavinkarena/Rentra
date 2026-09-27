import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { AdminPage, AdminPageHeader } from '@/components/admin/AdminPrimitives';
import { RefundRequest } from '@/components/admin/RefundCommands';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Request a refund', robots: { index: false, follow: false } };

/** Preview, then request a refund of a visit's remaining verified capture (CP20). */
export default async function NewRefundPage({ searchParams }) {
  const orderId = String((await searchParams)?.order ?? '');
  const { data, failure } = await settle(adminApi.refundableVisits(orderId));
  if (failure)
    return <PortalState kind={failure} backHref="/admin/finance/refunds" backLabel="Refunds" />;
  return (
    <AdminPage width="max-w-[1000px]">
      <AdminPageHeader
        eyebrow="Finance · Refunds"
        title={`Request a refund · ${data.reference}`}
        description={`${data.title}. Refunds come only from verified captures and never exceed what earlier refunds left.`}
      />
      <div className="mt-4">
        <Link
          href="/admin/finance/refunds"
          className="text-meta font-semibold text-brand-700 underline"
        >
          All refunds
        </Link>
      </div>
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        {data.testOnly ? (
          <RefundRequest order={data} requestKey={randomUUID()} />
        ) : (
          <p className="text-meta text-ink-700">
            This booking has no Razorpay Test capture to refund here. Live refunds use the live
            finance process.
          </p>
        )}
      </section>
    </AdminPage>
  );
}
