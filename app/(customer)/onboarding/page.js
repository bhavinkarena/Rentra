import { redirect } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { customerApi } from '@/lib/api/endpoints';
import { ProfileForm, CustomerLogout } from '@/components/customer/AccountForms';

export const metadata = { title: 'Welcome to Rentra' };
export default async function OnboardingPage() {
  const account = await customerApi.onboarding();
  if (account.complete) redirect('/account');
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <header>
          <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-h2">What should we call you?</h1>
          <p className="mt-2 text-ink-600">
            Add your name to keep saved places across devices. Any selected dates will be checked
            again when you return.
          </p>
        </header>
        <div className="mt-6">
          <ProfileForm account={account} onboarding />
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <CustomerLogout />
      </div>
    </div>
  );
}
