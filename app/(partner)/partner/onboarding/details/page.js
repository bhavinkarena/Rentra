import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import OnboardingShell from '@/components/partner/OnboardingShell';
import PhoneVerifyForm from '@/components/partner/PhoneVerifyForm';
import { DetailsForm } from '@/components/partner/onboarding-forms';

export const metadata = { title: 'Your details', robots: { index: false, follow: false } };

export default async function Page() {
  const user = await requireClient();
  const application = await partnerApi.application();

  return (
    <OnboardingShell
      current="details"
      title="Your details"
      intro="Use the name on your ID and a mobile number we can reach you on."
    >
      <DetailsForm user={user} application={application} />
      {user.name && application.residentialAddress ? (
        <section id="verify-mobile" className="mt-8 border-t border-border pt-6">
          <h2 className="mb-3 text-h3">Your mobile</h2>
          {user.phoneVerifiedAt ? (
            <p role="status">Mobile verified: +91 {user.phone}</p>
          ) : (
            <PhoneVerifyForm defaultPhone={user.phone ?? ''} />
          )}
        </section>
      ) : (
        <p className="mt-3 text-meta text-ink-500">
          Save your details, then verify your mobile here.
        </p>
      )}
    </OnboardingShell>
  );
}
