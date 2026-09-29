import { CreditCard } from 'lucide-react';
import { customerApi } from '@/lib/api/endpoints';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Payment methods' };

export default async function MethodsPage() {
  await customerApi.account();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: '/account', label: 'Account' }} title="Payment methods" />
      <div className="rounded-lg border border-border bg-card px-6">
        <EmptyState
          icon={CreditCard}
          title="No saved payment methods"
          description="Saved payment methods are not available yet. Select a test payment method in hosted Razorpay Test checkout when it is enabled."
        >
          <p className="text-meta text-ink-600">
            No payment details are needed here. No real bank money is collected in Test mode.
          </p>
        </EmptyState>
      </div>
    </div>
  );
}
