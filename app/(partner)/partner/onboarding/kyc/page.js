import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import OnboardingShell from '@/components/partner/OnboardingShell';
import KycUploadForm from '@/components/partner/KycUploadForm';

export const metadata = {
  title: 'Identity check',
  robots: { index: false, follow: false, nocache: true },
};

export default async function Page() {
  await requireClient();
  const [application, documents] = await Promise.all([
    partnerApi.application(),
    partnerApi.documents(),
  ]);

  return (
    <OnboardingShell
      step={4}
      title="Identity check"
      intro="Photos of one ID, and the name printed on it. We verify it during review, then you can publish."
    >
      <KycUploadForm application={application} documents={documents} />
    </OnboardingShell>
  );
}
