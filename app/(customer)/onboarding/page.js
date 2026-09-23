import { redirect } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ProfileForm, CustomerLogout } from '@/components/customer/AccountForms';

export const metadata = { title: 'Welcome to Rentra' };
export default async function OnboardingPage() {
  const account = await customerApi.onboarding();
  if (account.complete) redirect('/account');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1">What should we call you?</h1>
        <p className="mt-3 text-body text-ink-600">
          Add your name to keep saved places across devices. Any selected dates will be checked
          again when you return.
        </p>
      </header>
      <ProfileForm account={account} onboarding />
      <CustomerLogout />
    </div>
  );
}
