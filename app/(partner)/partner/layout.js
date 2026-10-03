import { cookies } from 'next/headers';
import PartnerPortal from '@/components/partner/PartnerPortal';
import OwnerToaster from '@/components/partner/OwnerToaster';
import { partnerCacheEnabled } from '@/lib/partner/flags';
import Link from '@/components/navigation/NavigationLink';
import { Suspense, cache } from 'react';
import { RentraLogo } from '@/components/rentra/Logo';
import { getCurrentUserWithCompletion } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { logout } from '@/lib/actions/auth';
import PartnerShell from '@/components/partner/PartnerShell';
import { portalFont } from '@/lib/portal-font';

const readNavigationCounts = cache(() => partnerApi.unreadUpdates().catch(() => null));

export const metadata = {
  title: 'Partner',
  // The whole partner surface is authenticated and must never be indexed.
  robots: { index: false, follow: false },
};

/**
 * No dev-mode banner and no on-screen code, deliberately.
 *
 * The bypass still works in development, but nothing about it is rendered:
 * printing a one-time code into the page defeats the point of it being a
 * code, and it makes every screenshot and demo look unfinished. Developers
 * read the real code from the server terminal, where `deliverOtp` prints it.
 */
export default async function PartnerLayout({ children }) {
  const { user, completion } = await getCurrentUserWithCompletion();

  if (user?.role === 'client') {
    // The badge is a convenience: an outage leaves it off rather than failing the page.
    const unread = user.capabilities?.includes('client.updates.read') ? (
      <Suspense fallback={null}>
        <UnreadUpdatesCount />
      </Suspense>
    ) : null;
    const counts = { unreadUpdates: unread };
    for (const key of [
      'bookingsAction',
      'reviewsUnreplied',
      'supportAwaiting',
      'propertiesNeedsChanges',
    ]) {
      counts[key] = (
        <Suspense fallback={null}>
          <NavigationCount field={key} />
        </Suspense>
      );
    }
    const cached = partnerCacheEnabled() && user.accountStatus === 'active' && user.cacheScope;
    const Shell = cached ? PartnerPortal : PartnerShell;
    const revision = (await cookies()).get('rentra_partner_revision')?.value ?? '';
    return (
      <div className={portalFont.variable}>
        <OwnerToaster />
        <Shell
          key={user.cacheScope ?? user.id}
          user={user}
          revision={revision}
          logoutAction={logout}
          counts={counts}
          completion={completion}
        >
          {children}
        </Shell>
      </div>
    );
  }

  return (
    <div className="owner-portal flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-(--container-page) items-center gap-4 px-4 py-3 sm:px-6">
          {/* Same lockup as the public site, with a product suffix — this is
              the owner's proof they are on Rentra and not a lookalike. */}
          <Link href="/partner" className="flex shrink-0 flex-col items-start gap-1">
            <RentraLogo className="h-7 w-auto" />
            <span className="text-meta font-semibold text-ink-500">for owners</span>
          </Link>

          <Link
            href="/"
            className="ml-auto rounded-full px-3 py-1.5 text-meta font-medium text-ink-600 hover:bg-ink-50"
          >
            Back to Rentra
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

async function UnreadUpdatesCount() {
  const result = await readNavigationCounts();
  return result?.unread > 0 ? (
    <>
      {result.unread > 9 ? '9+' : result.unread}
      <span className="sr-only"> unread updates</span>
    </>
  ) : null;
}

async function NavigationCount({ field }) {
  const result = await readNavigationCounts();
  const count = result?.[field];
  return count > 0 ? (
    <>
      {count > 9 ? '9+' : count}
      <span className="sr-only"> needing your attention</span>
    </>
  ) : null;
}
