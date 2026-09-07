import Link from 'next/link';
import { RentraLogo } from '@/components/rentra/Logo';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { adminLogout } from '@/lib/auth/admin-actions';

export const metadata = {
  title: 'Rentra Admin',
  // Never indexed, never followed. This surface should not exist to a crawler.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }) {
  const admin = await getCurrentAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-ink-25">
      <header className="border-b-2 border-ink-900 bg-ink-900">
        <div className="mx-auto flex max-w-(--container-page) items-center gap-4 px-6 py-3">
          {/* `inverse` swaps the artwork to the palette greens that hold up on
              the ink-900 chrome; the delivered deep green goes muddy on it. */}
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            <RentraLogo tone="inverse" className="h-7 w-auto" />
            <span className="h-5 w-px bg-ink-700" aria-hidden="true" />
            <span className="text-meta font-semibold text-ink-400">admin</span>
          </Link>
          {admin ? (
            <div className="ml-auto flex items-center gap-3">
              {/* A visible reminder that the second factor is not on yet. */}
              {!admin.hasTotp ? (
                <span className="rounded-full bg-amber-500 px-2.5 py-1 text-tiny font-bold text-white">
                  2FA not enrolled
                </span>
              ) : null}
              <span className="hidden text-meta text-ink-300 sm:inline">{admin.email}</span>
              <form action={adminLogout}>
                <button
                  type="submit"
                  className="rounded-full px-3 py-1.5 text-meta font-medium text-ink-300 hover:bg-ink-800 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
