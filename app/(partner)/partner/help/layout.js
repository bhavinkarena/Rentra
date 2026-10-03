import PortalPage from '@/components/portal/PortalPage';
import HelpNav from '@/components/partner/help/HelpNav';
export default function Layout({ children }) {
  return (
    <PortalPage>
      <HelpNav />
      {children}
    </PortalPage>
  );
}
