import { notFound, redirect } from 'next/navigation';
import { customerApi, bookingApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import Checkout from '@/components/customer/Checkout';
export const metadata = { title: 'Review test booking' };
export default async function CheckoutReviewPage({ params }) {
  await customerApi.account();
  const { quoteId } = await params;
  let data;
  try { data = await bookingApi.reviewQuote(quoteId); }
  catch (error) {
    /* A malformed or unknown quote is the same dead end to the guest. */
    if (error instanceof ApiError && [400, 404, 422].includes(error.status)) notFound();
    throw error;
  }
  if (data.existingOrderId) redirect(`/checkout/${data.existingOrderId}`);
  return <Checkout key={quoteId} data={data}/>;
}
