import Link from 'next/link';
import { RentraLogo } from '@/components/rentra/Logo';
import { getCurrentAdmin } from '@/lib/api/session';
import { adminLogout } from '@/lib/actions/auth';
import AdminShell from '@/components/admin/AdminShell';
import { adminApi } from '@/lib/api/endpoints';
import { portalFont } from '@/lib/portal-font';

export const metadata = {
  title: 'Rentra Admin',
  // Never indexed, never followed. This surface should not exist to a crawler.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }) {
  const admin = await getCurrentAdmin();

  if (admin) {
    // Sidebar badge only; a failure (or missing permission) just hides it.
    const stats = admin.capabilities?.includes('admin.applications.read')
      ? await adminApi.applicationStats().catch(() => null)
      : null;
    return (
      <div className={portalFont.variable}>
        <AdminShell
          admin={admin}
          logoutAction={adminLogout}
          counts={{ waitingApplications: stats?.submitted || undefined }}
        >
          {children}
        </AdminShell>
      </div>
    );
  }

  return (
    <div className={`portal-ui flex min-h-screen flex-col bg-ink-25 ${portalFont.variable}`}>
      <header className="border-b-2 border-ink-900 bg-ink-900">
        <div className="mx-auto flex w-full max-w-(--container-page) items-center gap-4 px-4 py-4 sm:px-6">
          {/* `inverse` swaps the artwork to the palette greens that hold up on
              the ink-900 chrome; the delivered deep green goes muddy on it. */}
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            <RentraLogo tone="inverse" className="h-7 w-auto" />
            <span className="h-5 w-px bg-ink-700" aria-hidden="true" />
            <span className="text-meta font-semibold text-ink-400">admin</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
