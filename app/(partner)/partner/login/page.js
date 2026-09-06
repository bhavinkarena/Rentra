import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/dal';
import LoginForm from '@/components/partner/LoginForm';

export const metadata = {
  title: 'Partner log in',
  description: 'List your farmhouse on Rentra and take bookings directly.',
  robots: { index: false, follow: false },
};

/**
 * SEPARATE ENTRY POINT PER ROLE.
 *
 * An account carries exactly one role, fixed at signup, so the role cannot be
 * inferred from a credential — the login route has to declare it. Uniqueness
 * in the database is on (email, role), so the same address can hold one
 * Client account and one Customer account, linked by person_id so that KYC is
 * only ever done once.
 */
export default async function PartnerLoginPage({ searchParams }) {
  // Next 16: searchParams is a Promise.
  const params = await searchParams;
  const user = await getCurrentUser();

  // Already signed in — no reason to show a login form.
  if (user?.role === 'client' && user.accountStatus !== 'blocked') {
    redirect('/partner');
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-h1">Earn from your farmhouse</h1>
      <p className="mt-2 text-body text-ink-600">
        We photograph it, list it, and handle the money. You keep the calendar.
      </p>

      {params?.blocked ? (
        <p className="mt-5 rounded-md border border-danger/30 bg-danger-bg p-3 text-meta text-danger">
          This account has been blocked. Reply to any Rentra email to appeal.
        </p>
      ) : null}

      <div className="mt-8">
        <LoginForm />
      </div>

      <p className="mt-8 border-t border-border pt-6 text-meta text-ink-600">
        Looking to book instead?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Guest log in
        </Link>
      </p>
    </div>
  );
}
