import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/api/session';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * No self-signup, no password reset link, no "forgot password".
 *
 * Admin accounts come into existence only through `npm run seed:admin`, which
 * is also how a password is reset. A self-service reset flow on the account
 * that releases payouts is a phishing surface with no upside.
 */
export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  if (await getCurrentAdmin()) redirect('/admin');

  return (
    <div className="mx-auto flex min-h-[calc(100vh-66px)] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {params?.session === 'ended' ? (
          <p role="status" className="mb-5 rounded-md border border-border bg-ink-25 p-3 text-meta">
            Sign in again to continue. Your session may have expired or been revoked after an access
            change.
          </p>
        ) : null}
        <span className="grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-[0.68rem] font-bold tracking-[0.12em] text-brand-700 uppercase">
          Secure operations
        </p>
        <h1 className="mt-1 text-h2">Admin sign in</h1>
        <p className="mt-2 text-meta leading-6 text-ink-600">
          Use your provisioned staff account to access the Rentra operations console.
        </p>
        <div className="mt-7">
          <AdminLoginForm />
        </div>
        <div className="mt-6 flex gap-2 border-t border-border pt-5 text-tiny leading-5 text-ink-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
          <p>
            There is no public registration or self-service password reset for administrator
            accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
