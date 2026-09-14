import Link from 'next/link';
import { RentraLogo } from '@/components/rentra/Logo';
import { Button } from '@/components/ui/button';
import CustomerLoginForm from '@/components/customer/CustomerLoginForm';
import { getCurrentUser } from '@/lib/auth/dal';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { switchToCustomer } from '@/lib/auth/customer-actions';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Log in',
  robots: { index: false, follow: false },
};

/**
 * SEPARATE ENTRY POINT PER ROLE.
 *
 * An account carries exactly one role, so the role cannot be inferred from a
 * phone number — the login route has to declare it. Uniqueness in the db is
 * on (phone, role), not phone alone, so the same number can hold one
 * Customer and one Client account.
 */
export default async function CustomerLoginPage() {
  const user = await getCurrentUser();
  const admin = await getCurrentAdmin();
  const conflict = admin || (user && user.role !== 'customer');
  if (!conflict && user?.role === 'customer') redirect('/account');
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      {/* This route sits outside the marketing shell, so it has no header.
          The lockup is the only branding and the only way back out. */}
      <Link href="/" className="mb-8 self-start">
        <RentraLogo className="h-8 w-auto" />
      </Link>

      <h1 className="text-h1">Log in to book</h1>
      <p className="mt-2 text-body text-ink-600">
        Use your mobile number and a one-time code to continue.
      </p>

      {conflict ? <div className="mt-8 space-y-4">
        <p className="text-meta">You are signed in as {admin ? 'an administrator' : 'a partner'}. Customer booking uses a separate account.</p>
        <form action={switchToCustomer}><Button type="submit" className="w-full">Sign out and continue as customer</Button></form>
        <Link href={admin ? '/admin' : '/partner'} className="inline-flex min-h-11 items-center text-brand-700 underline">Keep my current account</Link>
      </div> : <CustomerLoginForm />}

      <p className="mt-8 border-t border-border pt-6 text-meta text-ink-600">
        Own a farmhouse?{' '}
        <Link href="/partner/login" className="font-semibold text-brand-700 hover:underline">
          Log in as a partner
        </Link>
      </p>
    </div>
  );
}
