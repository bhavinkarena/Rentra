import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/dal';
import { logout } from '@/lib/auth/actions';

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
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-(--container-page) items-center gap-4 px-6 py-3">
          <Link href="/partner" className="text-h4 font-extrabold tracking-tight text-brand-700">
            Rentra <span className="font-semibold text-ink-500">for owners</span>
          </Link>

          {user ? (
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-meta text-ink-600 sm:inline">
                {user.name || user.email}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-full px-3 py-1.5 text-meta font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                >
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/"
              className="ml-auto rounded-full px-3 py-1.5 text-meta font-medium text-ink-600 hover:bg-ink-50"
            >
              Back to Rentra
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
