import Link from 'next/link';
import { customerPageAccount } from '@/lib/customer/page';
import { ProfileForm, CustomerLogout } from '@/components/customer/AccountForms';

export const metadata={title:'Account'};
export default async function AccountPage() {
  const account=await customerPageAccount();
  return <div className="space-y-8"><header><h1 className="text-h1">Your account</h1><p className="mt-3 text-body text-ink-600">Manage your profile and contact preferences.</p></header>
    <section className="rounded-lg border border-border bg-card p-5"><h2 className="text-h3">Verified mobile number</h2><p className="mt-2">+91 {account.phone}</p><Link href="/account/phone" className="mt-2 inline-flex min-h-11 items-center text-brand-700 underline">Change mobile number</Link></section>
    <ProfileForm account={account}/>
    <nav aria-label="Account settings" className="flex flex-col border-t border-border pt-4"><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href="/account/payment-methods">Payment methods</Link><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href="/account/privacy">Privacy and account requests</Link></nav><CustomerLogout/>
  </div>;
}
