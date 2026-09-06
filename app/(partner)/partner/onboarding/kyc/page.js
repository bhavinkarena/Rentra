import { requireClient } from '@/lib/auth/dal';
import { getOrCreateApplication } from '@/lib/auth/application';
import { listDocuments } from '@/lib/auth/documents';
import OnboardingShell from '@/components/partner/OnboardingShell';
import KycUploadForm from '@/components/partner/KycUploadForm';

export const metadata = {
  title: 'Identity check',
  robots: { index: false, follow: false, nocache: true },
};

export default async function Page() {
  const user = await requireClient();
  const application = await getOrCreateApplication(user.id);
  const documents = await listDocuments({
    ownerType: 'client_application',
    ownerId: application.id,
  });

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
