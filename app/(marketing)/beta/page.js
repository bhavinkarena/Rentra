import Link from '@/components/navigation/NavigationLink';
import { BedDouble } from 'lucide-react';
import { getCurrentUser } from '@/lib/api/session';
import BetaClaim from './BetaClaim';

export const metadata = { title: 'Rentra Stays beta', robots: { index: false, follow: false } };

/** The invite link (hotel plan, Phase 9): invited guests open Hotels before launch. */
export default async function BetaPage() {
  const user = await getCurrentUser().catch(() => null);
  const customer = user?.role === 'customer';
  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700">
        <BedDouble className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-h2">Rentra Stays beta</h1>
      <p className="mt-2 text-body text-ink-600">
        You are invited to book hotels on Rentra before launch. Log in with the mobile number the
        invite was sent to.
      </p>
      <div className="mt-6">
        {customer ? (
          <BetaClaim />
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover"
          >
            Log in to continue
          </Link>
        )}
      </div>
      {!customer ? (
        <p className="mt-3 text-tiny text-ink-500">
          After logging in, open your invite link again.
        </p>
      ) : null}
    </section>
  );
}
