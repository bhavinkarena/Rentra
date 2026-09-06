import { requireClient } from '@/lib/auth/dal';
import { getOrCreateApplication } from '@/lib/auth/application';
import OnboardingShell from '@/components/partner/OnboardingShell';
import { DetailsForm } from '@/components/partner/onboarding-forms';

export const metadata = { title: 'Your details', robots: { index: false, follow: false } };

export default async function Page() {
  const user = await requireClient();
  const application = await getOrCreateApplication(user.id);

  return (
    <OnboardingShell step={3} title="Your details" intro="We name-match these against your ownership document later, so accuracy matters more than speed.">
      <DetailsForm user={user} application={application} />
    </OnboardingShell>
  );
}
