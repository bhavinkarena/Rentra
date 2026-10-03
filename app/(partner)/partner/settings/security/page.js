import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import SettingsHeading from '@/components/partner/settings/SettingsHeading';
import OwnerSecurity from '@/components/partner/OwnerSecurity';
export const metadata = { title: 'Login & security', robots: { index: false, follow: false } };
export default async function Page() {
  await requireClient();
  const { data, failure } = await settle(partnerApi.ownerSecurity());
  if (failure) return <PortalState kind={failure} />;
  return (
    <section className="min-w-0">
      <SettingsHeading
        title="Login & security"
        description="Manage verified contact details and the devices signed in to your account."
      />
      <OwnerSecurity data={data} />
    </section>
  );
}
