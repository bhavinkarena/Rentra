import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { requireClient } from '@/lib/auth/dal';
import PhoneVerifyForm from '@/components/partner/PhoneVerifyForm';

export const metadata = {
  title: 'Verify your mobile',
  robots: { index: false, follow: false },
};

export default async function VerifyPhonePage() {
  const user = await requireClient();

  // Nothing to do here if it is already verified — do not make them re-prove it.
  if (user.phoneVerifiedAt) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <Link
          href="/partner"
          className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <Check className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
          <div>
            <p className="text-h4 font-bold text-brand-900">Mobile already verified</p>
            <p className="mt-1 text-meta text-brand-800">
              +91 {user.phone} will receive your booking alerts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user.accountStatus === 'blocked') redirect('/partner/login?blocked=1');

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/partner"
        className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>

      <p className="mt-6 text-tiny font-bold tracking-wider text-brand-700 uppercase">
        Step 2 of 6
      </p>
      <h1 className="mt-1 text-h1">Verify your mobile</h1>
      <p className="mt-2 text-body text-ink-600">
        Your email signs you in. Your mobile is how we actually reach you.
      </p>

      <div className="mt-8">
        <PhoneVerifyForm defaultPhone={user.phone ?? ''} />
      </div>
    </div>
  );
}
