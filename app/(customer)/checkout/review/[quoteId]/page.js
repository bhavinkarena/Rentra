import { notFound, redirect } from 'next/navigation';
import { customerPageAccount } from '@/lib/customer/page';
import { getSession } from '@/lib/auth/dal';
import { sql } from '@/lib/db';
import { readCheckoutReview } from '@/lib/booking/checkout-review';
import Checkout from '@/components/customer/Checkout';
export const metadata = { title: 'Review test booking' };
export default async function CheckoutReviewPage({ params }) {
  await customerPageAccount();
  const { quoteId } = await params;
  let data;
  try { data = await readCheckoutReview(sql, await getSession(), quoteId); }
  catch (error) { if (error.code === 'CHECKOUT_NOT_FOUND' || error.name === 'ZodError') notFound(); throw error; }
  if (data.existingOrderId) redirect(`/checkout/${data.existingOrderId}`);
  return <Checkout key={quoteId} data={data}/>;
}
