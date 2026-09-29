import { LockKeyhole } from 'lucide-react';

export default function PaymentVerification({ checking = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-5 rounded-lg border border-brand-200 bg-brand-50/60 px-5 py-6 text-center sm:px-8"
    >
      <div
        aria-hidden="true"
        className="relative mx-auto mb-4 grid size-14 place-items-center rounded-full bg-white shadow-sm"
      >
        <span className="absolute inset-0 rounded-full border-2 border-brand-200 border-t-brand-600 motion-safe:animate-spin" />
        <LockKeyhole className="size-5 text-brand-700" />
      </div>
      <h3 className="text-base font-semibold text-ink-900">Confirming your payment</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-600">
        We’re waiting for a secure confirmation. Your booking will update here once it arrives.
      </p>
      <p className="mt-4 text-xs font-medium text-brand-800">
        {checking
          ? 'Checking your payment status…'
          : 'Taking longer? You can check the status below.'}
      </p>
      <p className="mt-2 text-xs text-ink-500">Please don’t make another payment while we check.</p>
    </div>
  );
}
