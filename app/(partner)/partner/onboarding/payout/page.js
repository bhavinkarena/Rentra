import { requireClient } from '@/lib/auth/dal';
import { getOrCreateApplication } from '@/lib/auth/application';
import OnboardingShell from '@/components/partner/OnboardingShell';
import { PayoutForm } from '@/components/partner/onboarding-forms';

export const metadata = { title: 'Where we should pay you', robots: { index: false, follow: false } };

export default async function Page() {
  const user = await requireClient();
  const application = await getOrCreateApplication(user.id);

  return (
    <OnboardingShell step={5} title="Where we should pay you" intro="Guests pay Rentra. We pass it to you after check-in, minus our fee.">
      <PayoutForm user={user} application={application} />
    </OnboardingShell>
  );
}
