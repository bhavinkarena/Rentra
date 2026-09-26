import { notFound, redirect } from 'next/navigation';
import { customerApi, bookingApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { ProfileForm } from '@/components/customer/AccountForms';
import Checkout from '@/components/customer/Checkout';
export const metadata = { title: 'Review test booking' };
export default async function CheckoutReviewPage({ params }) {
  const account = await customerApi.account();
  const { quoteId } = await params;
  let data;
  try {
    data = await bookingApi.reviewQuote(quoteId);
  } catch (error) {
    /* A malformed or unknown quote is the same dead end to the guest. */
    if (error instanceof ApiError && [400, 404, 422].includes(error.status)) notFound();
    throw error;
  }
  if (data.existingOrderId) redirect(`/checkout/${data.existingOrderId}`);
  if (!account.complete)
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6">
        <h1 className="text-h2">What should we call you?</h1>
        <p className="mt-2 mb-6 text-sm text-ink-600">
          Add your name for this booking. Your selected dates stay here while you finish your
          profile.
        </p>
        <ProfileForm account={account} />
      </section>
    );
  return <Checkout key={quoteId} data={data} />;
}
