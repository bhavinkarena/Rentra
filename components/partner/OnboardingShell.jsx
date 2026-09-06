import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function OnboardingShell({ step, total = 6, title, intro, children }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link
        href="/partner"
        className="inline-flex items-center gap-1.5 text-meta font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>

      <p className="mt-6 text-tiny font-bold tracking-wider text-brand-700 uppercase">
        Step {step} of {total}
      </p>
      <h1 className="mt-1 text-h1">{title}</h1>
      {intro ? <p className="mt-2 text-body text-ink-600">{intro}</p> : null}

      <div className="mt-8">{children}</div>
    </div>
  );
}
