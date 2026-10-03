'use client';
import { usePathname } from 'next/navigation';
import PortalPage from '@/components/portal/PortalPage';
import SettingsTabs from '@/components/partner/SettingsTabs';
import { BackLink } from '@/components/ui/page-header';
export default function SettingsFrame({ children }) {
  const overview = usePathname() === '/partner/settings';
  return (
    <PortalPage>
      {overview ? (
        children
      ) : (
        <>
          <BackLink href="/partner/settings">Settings</BackLink>
          <div className="mt-5 grid items-start gap-7 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
            <SettingsTabs />
            <div className="min-w-0 max-w-4xl">{children}</div>
          </div>
        </>
      )}
    </PortalPage>
  );
}
