import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import NotificationPreferences from '@/components/partner/NotificationPreferences';
import SettingsTabs from '@/components/partner/SettingsTabs';
export default async function Page() {
  await requireClient();
  const { data, failure } = await settle(partnerApi.ownerNotifications());
  if (failure) return <PortalState kind={failure} />;
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <h1 className="text-h1">Notification settings</h1>
      <SettingsTabs />
      <NotificationPreferences data={data} />
    </section>
  );
}
