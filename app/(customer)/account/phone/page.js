import Link from 'next/link';
import { customerApi } from '@/lib/api/endpoints';
import { PhoneChangeForm } from '@/components/customer/AccountForms';
export const metadata={title:'Change mobile number'};
export default async function PhonePage() {
  await customerApi.account();
  return <div className="space-y-6"><Link href="/account" className="text-brand-700 underline">Back to account</Link><h1 className="text-h1">Change mobile number</h1><p className="text-body text-ink-600">Verify a code sent to your new number before it replaces your login number. Other signed-in sessions will be signed out after the change.</p><PhoneChangeForm/></div>;
}
