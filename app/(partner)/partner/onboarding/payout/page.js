import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import OnboardingShell from '@/components/partner/OnboardingShell';
import { PayoutForm } from '@/components/partner/onboarding-forms';

export const metadata = {
  title: 'Where we should pay you',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const user = await requireClient();
  const application = await partnerApi.application();

  return (
    <OnboardingShell
      step={5}
      title="Where we should pay you"
      intro="Guests pay Rentra. We pass it to you after check-in, minus our fee."
    >
      <PayoutForm user={user} application={application} />
    </OnboardingShell>
  );
}
