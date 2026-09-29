import CustomerNavigation from '@/components/customer/CustomerNavigation';
import SiteChrome from '@/components/rentra/SiteChrome';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { failureKind } from '@/lib/domain/portal-state';
import PortalState from '@/components/portal/PortalState';
import { requireCustomer } from '@/lib/api/session';

export const metadata = {
  title: { default: 'Your account', template: '%s | Rentra' },
  robots: { index: false, follow: false, nocache: true },
};

const content = 'mx-auto w-full max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12';

export default async function CustomerLayout({ children }) {
  let user;
  try {
    user = await requireCustomer();
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect('/login');
    return (
      <SiteChrome whatsapp={false}>
        <div className={content}>
          <PortalState kind={failureKind(error)} backHref="/" backLabel="Home" />
        </div>
      </SiteChrome>
    );
  }
  return (
    <SiteChrome
      navigation={<CustomerNavigation authenticated compact profile={{ name: user.name }} />}
      contentId="customer-content"
      skipLabel="Skip to account content"
      whatsapp={false}
    >
      <div className={content}>{children}</div>
    </SiteChrome>
  );
}
