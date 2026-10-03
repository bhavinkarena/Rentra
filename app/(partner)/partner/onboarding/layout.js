import { redirect } from 'next/navigation';
import { requireClient, getCurrentUserWithCompletion } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import OnboardingShell from '@/components/partner/OnboardingShell';
import ApplicationReview from '@/components/partner/ApplicationReview';
export default async function OnboardingLayout({ children }) {
  const user = await requireClient();
  if (user.accountStatus === 'active') redirect('/partner/settings?notice=verified');
  const { completion } = await getCurrentUserWithCompletion();
  if (!completion.submitted) return children;
  const application = await partnerApi.application();
  return (
    <OnboardingShell
      current="review"
      title="With Rentra for review"
      intro="Your submitted details are read-only. Withdraw your application if you need to edit them."
    >
      <ApplicationReview user={user} application={application} completion={completion} readOnly />
    </OnboardingShell>
  );
}
