import Link from 'next/link';
import { customerPageAccount } from '@/lib/customer/page';
export const metadata={title:'Saved places'};
export default async function SavedPage() {
  await customerPageAccount();
  return <div className="space-y-5"><h1 className="text-h1">Saved places</h1><p className="text-body text-ink-600">Saving places to your account is coming soon. The current listing heart does not save across devices.</p><Link href="/" className="inline-flex min-h-11 items-center text-brand-700 underline">Explore places</Link></div>;
}
