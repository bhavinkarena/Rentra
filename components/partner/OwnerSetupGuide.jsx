'use client';
import Link from '@/components/navigation/NavigationLink';
import { Check, Circle } from 'lucide-react';
import { useActionState } from 'react';
import { saveOwnerGuide } from '@/lib/actions/partner';
import FormError from '@/components/portal/FormError';
export default function OwnerSetupGuide({ guide, expanded = true }) {
  const [state, action, pending] = useActionState(saveOwnerGuide, {});
  if (guide.dismissed) return null;
  return (
    <details open={expanded} className="mt-6 rounded-lg border border-brand-200 bg-card p-5">
      <summary className="cursor-pointer text-h3 font-bold">
        Get ready for bookings{' '}
        <span className="block text-meta font-normal text-ink-600">
          {guide.done} of {guide.total} done
        </span>
      </summary>
      <progress
        value={guide.done}
        max={guide.total}
        aria-label="Booking setup progress"
        className="mt-4 h-2 w-full accent-brand-600"
      />
      <ul className="mt-4 divide-y divide-border">
        {guide.steps.map((step) => (
          <li key={step.id} className="flex flex-wrap items-center gap-3 py-3">
            {step.done ? (
              <Check className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
            ) : (
              <Circle className="size-5 shrink-0 text-ink-400" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {step.title}
                {step.optional ? ' (optional)' : ''}
                <span className="sr-only">{step.done ? ' — done' : ' — to do'}</span>
              </p>
              <p className="text-meta text-ink-600">{step.why}</p>
              {step.scheduledAt ? (
                <p className="text-meta text-brand-700">
                  Scheduled{' '}
                  {new Date(step.scheduledAt).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  IST
                </p>
              ) : null}
            </div>
            {!step.done || step.scheduledAt ? (
              <Link
                href={step.href}
                className="min-h-11 py-3 text-meta font-semibold text-brand-700"
              >
                {step.action}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {guide.canDismiss ? (
        <form action={action}>
          <input type="hidden" name="checklistDismissedAt" value="true" />
          <FormError state={state} />
          <button disabled={pending} className="mt-3 min-h-11 font-semibold text-brand-700">
            Dismiss setup guide
          </button>
        </form>
      ) : null}
    </details>
  );
}
