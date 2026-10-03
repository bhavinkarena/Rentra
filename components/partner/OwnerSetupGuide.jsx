'use client';
import Link from '@/components/navigation/NavigationLink';
import { Check } from 'lucide-react';
import { useActionState } from 'react';
import { saveOwnerGuide } from '@/lib/actions/partner';
import FormError from '@/components/portal/FormError';

const PANEL = 'owner-setup-panel';
const close = () => document.getElementById(PANEL)?.hidePopover?.();

/** Progress drawn on the ring itself, so the count reads at a glance. */
function Ring({ done, total, size = 32, stroke = 3, children }) {
  const r = (size - stroke) / 2;
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-ink-200)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-brand-600)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${total ? (done / total) * 100 : 0} 100`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[0.625rem] leading-none font-bold text-ink-900 tabular">
        {children}
      </span>
    </span>
  );
}

/**
 * Header control for the "Get ready for bookings" checklist. Renders nothing once
 * every step is done or the owner dismissed it.
 */
export default function OwnerSetupGuide({ guide }) {
  const [state, action, pending] = useActionState(saveOwnerGuide, {});
  if (!guide || guide.dismissed || guide.done >= guide.total) return null;
  const percent = Math.round((guide.done / guide.total) * 100);
  const next = guide.steps.find((step) => !step.done);
  return (
    <>
      <button
        type="button"
        popoverTarget={PANEL}
        aria-label={`Get ready for bookings: ${guide.done} of ${guide.total} steps done`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-1.5 text-meta font-semibold text-ink-800 hover:border-brand-300 hover:bg-brand-50 md:pr-3.5"
      >
        <Ring done={guide.done} total={guide.total}>
          {guide.done}/{guide.total}
        </Ring>
        <span className="hidden md:inline">Finish setup</span>
      </button>
      <div
        id={PANEL}
        popover="auto"
        aria-label="Get ready for bookings"
        className="fixed inset-auto top-16 right-3 m-0 max-h-[calc(100dvh-5rem)] w-[min(25rem,calc(100vw-1.5rem))] overflow-auto rounded-lg border border-border bg-card p-0 text-ink-900 shadow-lg sm:right-6"
      >
        <div className="flex items-center gap-4 border-b border-border p-5">
          <Ring done={guide.done} total={guide.total} size={56} stroke={5}>
            <span className="text-meta">{percent}%</span>
          </Ring>
          <div className="min-w-0">
            <h2 className="text-h4 font-semibold">Get ready for bookings</h2>
            <p className="text-meta text-ink-600">
              {guide.done} of {guide.total} done
              {next ? ` · next: ${next.title.toLowerCase()}` : ''}
            </p>
          </div>
        </div>
        <ol className="p-2">
          {guide.steps.map((step, index) => {
            const open = !step.done || step.scheduledAt;
            return (
              <li
                key={step.id}
                className={`flex gap-3 rounded-md p-3 ${step === next ? 'bg-brand-50' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-tiny font-bold ${step.done ? 'bg-brand-600 text-white' : 'border-2 border-ink-300 text-ink-600'}`}
                >
                  {step.done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-meta font-semibold ${step.done ? 'text-ink-500' : 'text-ink-900'}`}
                  >
                    {step.title}
                    {step.optional ? (
                      <span className="font-normal text-ink-500"> (optional)</span>
                    ) : null}
                    <span className="sr-only">{step.done ? ' — done' : ' — to do'}</span>
                  </p>
                  {step.done && !step.scheduledAt ? null : (
                    <p className="text-tiny leading-5 text-ink-600">{step.why}</p>
                  )}
                  {step.scheduledAt ? (
                    <p className="text-tiny text-brand-700">
                      Scheduled{' '}
                      {new Date(step.scheduledAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      IST
                    </p>
                  ) : null}
                  {open ? (
                    <Link
                      href={step.href}
                      onClick={close}
                      className={`mt-2 inline-flex min-h-11 items-center rounded-md px-3 text-meta font-semibold ${step === next ? 'bg-primary text-white hover:bg-primary-hover' : 'border border-border text-brand-700 hover:bg-ink-50'}`}
                    >
                      {step.action}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {guide.canDismiss ? (
          <form action={action} className="border-t border-border px-5 py-2">
            <input type="hidden" name="checklistDismissedAt" value="true" />
            <FormError state={state} />
            <button
              disabled={pending}
              className="min-h-11 text-meta font-semibold text-ink-600 hover:text-ink-900"
            >
              {pending ? 'Hiding…' : 'Hide this checklist'}
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}
