import Link from 'next/link';
import { RentraLogo } from '@/components/rentra/Logo';
import { getCurrentAdmin } from '@/lib/api/session';
import { adminLogout } from '@/lib/actions/auth';
import AdminShell from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Rentra Admin',
  // Never indexed, never followed. This surface should not exist to a crawler.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }) {
  const admin = await getCurrentAdmin();

  if (admin) {
    return (
      <AdminShell admin={admin} logoutAction={adminLogout}>
        {children}
      </AdminShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-25">
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
