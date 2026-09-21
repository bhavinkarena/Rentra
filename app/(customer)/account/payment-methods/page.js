import Link from 'next/link';
import { customerApi } from '@/lib/api/endpoints';
export const metadata={title:'Payment methods'};
export default async function MethodsPage() {
  await customerApi.account();
  return <div className="space-y-5"><Link href="/account" className="text-brand-700 underline">Back to account</Link><h1 className="text-h1">Payment methods</h1><p className="text-body text-ink-600">Saved payment methods are not available yet. Select a test payment method in hosted Razorpay Test checkout when it is enabled.</p><p className="text-meta">No payment details are needed here. No real bank money is collected in Test mode.</p></div>;
}
