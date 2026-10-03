import { requireClient, getCurrentUserWithCompletion } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import OnboardingShell from '@/components/partner/OnboardingShell';
import ApplicationReview from '@/components/partner/ApplicationReview';
export const metadata = {
  title: 'Review and submit verification',
  robots: { index: false, follow: false },
};
export default async function ReviewPage() {
  const user = await requireClient();
  const [{ completion }, application] = await Promise.all([
    getCurrentUserWithCompletion(),
    partnerApi.application(),
  ]);
  return (
    <OnboardingShell
      current="review"
      title="Review and submit"
      intro="Check your details before sending them to Rentra."
    >
      <ApplicationReview user={user} application={application} completion={completion} />
    </OnboardingShell>
  );
}
