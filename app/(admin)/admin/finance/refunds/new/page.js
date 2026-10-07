import { requireAdmin } from '@/lib/api/session';
import { randomUUID } from 'node:crypto';
import { AdminPage, AdminPageHeader, AdminReadOnly } from '@/components/admin/AdminPrimitives';
import { RefundRequest } from '@/components/admin/RefundCommands';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Request a refund', robots: { index: false, follow: false } };

/** Preview, then request a refund of a visit's remaining verified capture (CP20). */
export default async function NewRefundPage({ searchParams }) {
  const admin = await requireAdmin();
  if (!admin.capabilities.includes('admin.payments.write'))
    return (
      <AdminPage>
        <AdminPageHeader
          title="Request a refund"
          backHref="/admin/finance/refunds"
          backLabel="Refunds"
        />
        <AdminReadOnly>Refund requests require Finance write access.</AdminReadOnly>
      </AdminPage>
    );
  const orderId = String((await searchParams)?.order ?? '');
  const { data, failure } = await settle(adminApi.refundableVisits(orderId));
  if (failure)
    return <PortalState kind={failure} backHref="/admin/finance/refunds" backLabel="Refunds" />;
  return (
    <AdminPage width="max-w-[1000px]">
      <AdminPageHeader
        backHref="/admin/finance/refunds"
        backLabel="Refunds"
        title={`Request a refund · ${data.reference}`}
        description={`${data.title}. Refunds come only from verified captures and never exceed what earlier refunds left.`}
      />
      <section aria-label="Refund request" className="mt-6 border-t border-border pt-6">
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
