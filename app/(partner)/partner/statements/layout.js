import OwnerDestinationTabs from '@/components/partner/OwnerDestinationTabs';
import PortalPage from '@/components/portal/PortalPage';
export default function Layout({ children }) {
  return (
    <PortalPage>
      <OwnerDestinationTabs kind="earnings" />
      {children}
    </PortalPage>
  );
}
