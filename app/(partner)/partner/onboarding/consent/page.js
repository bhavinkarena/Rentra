import { requireClient } from '@/lib/auth/dal';
import { getOrCreateApplication } from '@/lib/auth/application';
import OnboardingShell from '@/components/partner/OnboardingShell';
import { ConsentForm } from '@/components/partner/onboarding-forms';

export const metadata = { title: 'Agree to the terms', robots: { index: false, follow: false } };

export default async function Page() {
  const user = await requireClient();
  const application = await getOrCreateApplication(user.id);

  return (
    <OnboardingShell step={6} title="Agree to the terms" intro="Two confirmations and you are done with your side.">
      <ConsentForm user={user} application={application} />
    </OnboardingShell>
  );
}
