import Link from '@/components/navigation/NavigationLink';
import { getCurrentUserWithCompletion } from '@/lib/api/session';
export default async function OnboardingShell({ current = 'details', title, intro, children }) {
  const { completion } = await getCurrentUserWithCompletion();
  const index = completion.steps.findIndex((step) => step.id === current);
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/partner" className="min-h-11 py-3 text-meta font-semibold text-brand-700">
          Back to Today
        </Link>
        <Link
          href={`/partner/help#verification-${current}`}
          className="min-h-11 py-3 text-meta font-semibold text-brand-700"
          aria-label={`Help with ${title}`}
        >
          ? Help
        </Link>
      </div>
      <ol aria-label="Verification progress" className="my-6 grid grid-cols-4 gap-2">
        {completion.steps.map((step, i) => (
          <li
            key={step.id}
            className={`border-t-4 pt-2 text-tiny ${step.id === current ? 'border-brand-600 font-bold' : step.done && !step.flagged ? 'border-brand-300' : 'border-border'}`}
          >
            <Link href={step.href} aria-current={step.id === current ? 'step' : undefined}>
              {i + 1}. {step.label}
              {step.done && !step.flagged ? ' ✓' : ''}
            </Link>
          </li>
        ))}
      </ol>
      <p className="text-meta text-ink-500">
        {index >= 0 ? `Step ${index + 1} of ${completion.total}` : 'Check your verification'}
      </p>
      <h1 className="mt-2 text-h1">{title}</h1>
      {intro ? <p className="mt-2 text-body text-ink-600">{intro}</p> : null}
      <div className="mt-7">{children}</div>
      <Link
        href="/partner/listings/new"
        className="mt-6 block min-h-11 py-3 text-meta font-semibold text-brand-700"
      >
        Start your first property draft
      </Link>
    </div>
  );
}
