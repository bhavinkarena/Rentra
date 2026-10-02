import PortalPage from '@/components/portal/PortalPage';
import OwnerHelpHeader from '@/components/partner/OwnerHelpHeader';
export default function Layout({ children }) {
  return (
    <PortalPage>
      <OwnerHelpHeader />
      {children}
    </PortalPage>
  );
}
