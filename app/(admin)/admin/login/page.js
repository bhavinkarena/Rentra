import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth/admin';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

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
export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect('/admin');

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-h2">Rentra admin</h1>
      <p className="mt-2 text-meta text-ink-600">
        Accounts are provisioned by script. There is no sign-up and no self-service reset.
      </p>
      <div className="mt-8">
        <AdminLoginForm />
      </div>
    </div>
  );
}
