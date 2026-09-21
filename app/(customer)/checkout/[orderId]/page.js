import { notFound } from 'next/navigation';
import { customerApi, bookingApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import Checkout from '@/components/customer/Checkout';
export const metadata = { title: 'Test booking status' };
export default async function CheckoutPage({ params }) {
  await customerApi.account();
  const { orderId } = await params;
  let data;
  try { data = await bookingApi.reviewOrder(orderId); }
  catch (error) {
    /* Someone else's order reads as absent, not forbidden. */
    if (error instanceof ApiError && [400, 403, 404, 422].includes(error.status)) notFound();
    throw error;
  }
  return <Checkout key={orderId} data={data}/>;
}
