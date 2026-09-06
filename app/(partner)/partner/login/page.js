import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const metadata = {
  title: 'Partner log in',
  description: 'List your farmhouse on Rentra and take bookings directly.',
};

export default function PartnerLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-h4 font-extrabold tracking-tight text-brand-700">
        Rentra <span className="font-semibold text-ink-500">for owners</span>
      </Link>

      <h1 className="mt-8 text-h1">Earn from your farmhouse</h1>
      <p className="mt-2 text-body text-ink-600">
        We photograph it, list it, and handle the money. You keep the calendar.
      </p>

      <form className="mt-8 space-y-4">
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-meta font-semibold text-ink-700">
            Mobile number
          </label>
          <Input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="98765 43210" />
        </div>
        <Button type="submit" size="lg" className="w-full">Send code</Button>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-meta text-ink-600">
        Looking to book instead?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Guest log in
        </Link>
      </p>
    </div>
  );
}
