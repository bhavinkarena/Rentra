import { redirect } from 'next/navigation';
import { customerPageAccount } from '@/lib/customer/page';
import { ProfileForm, CustomerLogout } from '@/components/customer/AccountForms';

export const metadata={title:'Welcome to Rentra'};
export default async function OnboardingPage() {
  const account=await customerPageAccount({onboarding:true});
  if(account.complete) redirect('/account');
  return <div className="space-y-6"><header><h1 className="text-h1">Welcome to Rentra</h1><p className="mt-3 text-body text-ink-600">Tell us your name to finish setting up your customer account. Your selected dates will be checked again when you continue.</p></header><ProfileForm account={account} onboarding/><CustomerLogout/></div>;
}
