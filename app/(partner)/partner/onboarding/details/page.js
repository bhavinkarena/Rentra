import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import OnboardingShell from '@/components/partner/OnboardingShell';
import { DetailsForm } from '@/components/partner/onboarding-forms';

export const metadata = { title: 'Your details', robots: { index: false, follow: false } };

export default async function Page() {
  const user = await requireClient();
  const application = await partnerApi.application();

  return (
    <OnboardingShell
      step={3}
      title="Your details"
      intro="We name-match these against your ownership document later, so accuracy matters more than speed."
    >
      <DetailsForm user={user} application={application} />
    </OnboardingShell>
  );
}
