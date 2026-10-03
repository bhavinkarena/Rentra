import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import NotificationPreferences from '@/components/partner/NotificationPreferences';
import SettingsHeading from '@/components/partner/settings/SettingsHeading';
export default async function Page() {
  await requireClient();
  const { data, failure } = await settle(partnerApi.ownerNotifications());
  if (failure) return <PortalState kind={failure} />;
  return (
    <section className="min-w-0">
      <SettingsHeading
        title="Notifications"
        description="Choose where you receive updates from your owner workspace."
      />
      <NotificationPreferences data={data} />
    </section>
  );
}
