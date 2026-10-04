import Link from '@/components/navigation/NavigationLink';
import AccountSwitchButton from '@/components/auth/AccountSwitchButton';
import AuthLayout from '@/components/auth/AuthLayout';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/session';
import LoginForm from '@/components/partner/LoginForm';

export const metadata = {
  title: 'Owner sign in or create account',
  description: 'List your farmhouse or venue on Rentra and take bookings directly.',
  robots: { index: false, follow: false },
};

/**
 * SEPARATE ENTRY POINT PER ROLE.
 *
 * An account carries exactly one role, fixed at signup, so the role cannot be
 * inferred from a credential — the login route has to declare it. Uniqueness
 * in the database is on (email, role), so the same address can hold one
 * Client account and one Customer account. Switching reuses live sessions
 * only after matching the verified mobile number on both accounts.
 */
export default async function PartnerLoginPage({ searchParams }) {
  // Next 16: searchParams is a Promise.
  const params = await searchParams;
  const user = await getCurrentUser();

  // Already signed in — no reason to show a login form.
  if (user?.role === 'client' && !['blocked', 'suspended'].includes(user.accountStatus)) {
    redirect('/partner');
  }

  return (
    <AuthLayout partner>
      <h1 className="text-h1">Earn from your farmhouse or venue</h1>
      <p className="mt-2 text-body text-ink-600">
        Sign in or create your owner account — it’s free.
      </p>

      {params?.blocked ? (
        <p className="mt-5 rounded-md border border-danger/30 bg-danger-bg p-3 text-meta text-danger">
          This account is restricted. Contact Rentra for account review and help with existing
          bookings.{' '}
          <Link href="/help" className="underline">
            Contact support
          </Link>
        </p>
      ) : null}

      {params?.session === 'reauth' ? (
        <p role="status" className="mt-5 rounded-md border border-border bg-card p-3 text-meta">
          Sign in again to confirm your payout change. Your draft is saved — open Settings, then
          Payout destination.
        </p>
      ) : null}

      {params?.session === 'ended' ? (
        <p role="status" className="mt-5 rounded-md border border-border bg-card p-3 text-meta">
          Sign in again to continue. Your previous session may have expired or been revoked.
        </p>
      ) : null}

      <ul className="mt-5 space-y-2 text-meta text-ink-600">
        <li>List in about 15 minutes</li>
        <li>Rentra checks every guest payment</li>
        <li>Save your UPI or bank details for when payouts are live</li>
      </ul>
      <div className="mt-8">
        <LoginForm next={params?.next || ''} />
      </div>

      <p className="mt-8 border-t border-border pt-6 text-meta text-ink-600">
        Looking to book instead?{' '}
        <AccountSwitchButton
          role="customer"
          className="font-semibold text-brand-700 hover:underline"
        >
          Book a property
        </AccountSwitchButton>
      </p>
    </AuthLayout>
  );
}
