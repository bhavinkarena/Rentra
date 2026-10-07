import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AdminPage, AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';
import { adminDateTime } from '@/lib/domain/admin-display';

export const metadata = { title: 'Finance', robots: { index: false, follow: false } };
export default async function FinancePage() {
  const admin = await requireAdmin();
  if (!admin.capabilities.includes('admin.payments.read'))
    return <PortalState kind="forbidden" backHref="/admin" backLabel="Overview" />;
  const [payments, refunds] = await Promise.all([
    settle(adminApi.paymentOrders({ environment: 'live', attention: 'needs_review' })),
    settle(adminApi.refunds({ environment: 'live', status: 'attention' })),
  ]);
  return (
    <AdminPage>
      <AdminPageHeader
        title="Finance"
        description="Review payment evidence, resolve refund questions, and inspect accounting records."
      />
      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {[
            ['Payments to review', payments, 'payments'],
            ['Refunds needing attention', refunds, 'refunds'],
          ].map(([title, result, type]) => {
            const href = `/admin/finance/${type}?environment=live&${type === 'payments' ? 'attention=needs_review' : 'status=attention'}`;
            return (
              <section
                key={type}
                className="overflow-hidden rounded-lg border border-border bg-card"
                aria-labelledby={`finance-${type}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h2 id={`finance-${type}`} className="text-h3 font-semibold">
                      {title}
                    </h2>
                    <p className="mt-1 text-meta text-ink-600">
                      Live evidence {result.data ? `/ ${result.data.total} matching records` : ''}
                    </p>
                  </div>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center gap-1.5 text-meta font-semibold text-brand-700"
                  >
                    Open queue <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                {result.failure ? (
                  <p role="status" className="p-5 text-meta text-danger">
                    This queue is unavailable. Open it to retry; no empty result is implied.
                  </p>
                ) : result.data.items.length ? (
                  <ul className="divide-y divide-border">
                    {result.data.items.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/admin/finance/${type}/${item.id}?from=${encodeURIComponent(href)}`}
                          className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-ink-25"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-meta font-semibold">
                              {item.bookingReference}
                            </p>
                            <p className="mt-1 break-words text-meta text-ink-600">{item.title}</p>
                          </div>
                          <StatusBadge tone={item.status.tone || 'warning'}>
                            {item.status.label}
                          </StatusBadge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-5 text-meta text-ink-600">
                    No Live records need attention in this queue.
                  </p>
                )}
                {result.data?.asOf ? (
                  <p className="border-t border-border px-5 py-3 text-meta text-ink-600">
                    As of {adminDateTime(result.data.asOf)}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <h2 className="border-b border-border px-5 py-4 text-h3 font-semibold">
              Financial records
            </h2>
            <ul className="divide-y divide-border">
              {[
                ['payments', 'Payments', 'Provider attempts and capture evidence'],
                ['refunds', 'Refunds', 'Obligations and verified outcomes'],
                ['statements', 'Statements', 'Monthly allocation and adjustment records'],
                ['payouts', 'Payouts', 'Recorded funding and destination evidence'],
              ].map(([path, title, copy]) => (
                <li key={path}>
                  <Link
                    href={`/admin/finance/${path}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-ink-25"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-meta font-semibold">{title}</p>
                      <p className="mt-1 text-meta leading-6 text-ink-600">{copy}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <p className="px-1 text-meta leading-6 text-ink-600">
            Provider evidence does not establish a bank balance. Live payout execution is
            unavailable; recorded settlement does not verify a bank transfer.
          </p>
        </aside>
      </div>
    </AdminPage>
  );
}
