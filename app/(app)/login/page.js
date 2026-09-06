import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
export default function CustomerLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-h1">Log in to book</h1>
      <p className="mt-2 text-body text-ink-600">
        We will send a one-time code to your phone.
      </p>

      <form className="mt-8 space-y-4">
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-meta font-semibold text-ink-700">
            Mobile number
          </label>
          <Input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="98765 43210" />
          <p className="mt-1.5 text-tiny text-ink-500">
            Searching never needs an account. You only log in to book.
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full">Send code</Button>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-meta text-ink-600">
        Own a farmhouse?{' '}
        <Link href="/partner/login" className="font-semibold text-brand-700 hover:underline">
          Log in as a partner
        </Link>
      </p>
    </div>
  );
}
