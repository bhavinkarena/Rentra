import { notFound } from 'next/navigation';
import { customerPageAccount } from '@/lib/customer/page';
import { getSession } from '@/lib/auth/dal';
import { sql } from '@/lib/db';
import { readOwnedCheckoutReview } from '@/lib/booking/checkout-review';
import Checkout from '@/components/customer/Checkout';
export const metadata = { title: 'Test booking status' };
export default async function CheckoutPage({ params }) {
  await customerPageAccount();
  const { orderId } = await params;
  let data;
  try { data = await readOwnedCheckoutReview(sql, await getSession(), orderId); }
  catch (error) { if (error.code === 'CHECKOUT_NOT_FOUND' || error.name === 'ZodError') notFound(); throw error; }
  return <Checkout key={orderId} data={data}/>;
}
