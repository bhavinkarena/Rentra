import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import SettingsTabs from '@/components/partner/SettingsTabs';
import OwnerSecurity from '@/components/partner/OwnerSecurity';
export const metadata = { title: 'Login & security', robots: { index: false, follow: false } };
export default async function Page() {
  await requireClient();
  const { data, failure } = await settle(partnerApi.ownerSecurity());
  if (failure) return <PortalState kind={failure} />;
  return (
    <section className="max-w-3xl mx-auto space-y-5 px-4 py-6 sm:px-6">
      <h1 className="text-h1">Login & security</h1>
      <SettingsTabs />
      <OwnerSecurity data={data} />
    </section>
  );
}
