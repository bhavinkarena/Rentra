import CustomerHeader from '@/components/customer/CustomerHeader';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { failureKind } from '@/lib/domain/portal-state';
import PortalState from '@/components/portal/PortalState';
import { requireCustomer } from '@/lib/api/session';
import Providers from '@/components/providers';

export const metadata = {
  title: { default: 'Your account', template: '%s | Rentra' },
  robots: { index: false, follow: false, nocache: true },
};
export default async function CustomerLayout({ children }) {
  let user;
  try {
    user = await requireCustomer();
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect('/login');
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <PortalState kind={failureKind(error)} backHref="/" backLabel="Home" />
      </main>
    );
  }
  return (
    <Providers>
      <div className="min-h-dvh bg-ink-25">
        <a href="#customer-content" className="sr-only focus:not-sr-only focus:block focus:p-3">
          Skip to account content
        </a>
        <CustomerHeader authenticated profile={{ name: user.name }} />
        <main
          tabIndex={-1}
          id="customer-content"
          className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12"
        >
          {children}
        </main>
      </div>
    </Providers>
  );
}
