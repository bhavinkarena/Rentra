import Link from 'next/link';
import { Check, AlertTriangle, Clock } from 'lucide-react';

/**
 * The Client dashboard until they are approved.
 *
 * Two phases, deliberately. A single bar that fills to 100% while the
 * "Add place" button stays locked is worse than showing no bar at all — the
 * Client has done everything asked and the product still says no. So the
 * review step is rendered from the very first visit, in its own phase, and
 * the bar never reads "100% complete".
 */
export default function CompletionStepper({ completion }) {
  const { steps, done, total, minutesLeft, percent, submitted, approved, review } = completion;

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
        <p className="font-semibold text-ink-900">
          {approved
            ? 'Profile complete and approved'
            : submitted
              ? `${done} of ${total} submitted · in review`
              : `${done} of ${total} steps done`}
          {!submitted && !approved && minutesLeft > 0 ? (
            <span className="font-normal text-ink-500"> · about {minutesLeft} min left</span>
          ) : null}
        </p>
        <p className="text-ink-500">
          {approved ? 'You can publish' : submitted ? 'With Rentra' : 'Not yet submitted'}
        </p>
      </div>

      <div
        className="mt-2.5 mb-4 flex h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Profile completion"
      >
        <span
          className={approved || !submitted ? 'bg-brand-600' : 'bg-amber-500'}
          style={{ width: `${percent}%` }}
        />
      </div>

      <Phase label="Phase 1 — yours to complete" first />
      <ul className="mt-1">
        {steps.map((step, i) => (
          <StepRow key={step.id} step={step} index={i + 1} />
        ))}
      </ul>

      <Phase label="Phase 2 — ours" />
      <ul className="mt-1">
        <li className="flex items-start gap-3 py-2 text-meta">
          <span
            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-tiny font-bold ${
              review.state === 'done'
                ? 'bg-brand-600 text-white'
                : review.state === 'in_review'
                  ? 'bg-amber-500 text-white'
                  : 'bg-ink-200 text-ink-600'
            }`}
          >
            {review.state === 'done' ? <Check className="size-3" aria-hidden="true" /> : <Clock className="size-3" aria-hidden="true" />}
          </span>
          <span className="flex-1">
            <span className="font-semibold text-ink-900">{review.label}</span>
            <span className="block text-tiny text-ink-500">{review.hint}</span>
          </span>
        </li>
      </ul>
    </section>
  );
}

function Phase({ label, first }) {
  return (
    <p
      className={`text-tiny font-bold tracking-wider text-brand-700 uppercase ${
        first ? '' : 'mt-4 border-t border-border pt-3'
      }`}
    >
      {label}
    </p>
  );
}

function StepRow({ step, index }) {
  const body = (
    <>
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-tiny font-bold ${
          step.done
            ? 'bg-brand-600 text-white'
            : step.failed
              ? 'bg-danger text-white'
              : 'bg-ink-200 text-ink-600'
        }`}
      >
        {step.done ? (
          <Check className="size-3" aria-hidden="true" />
        ) : step.failed ? (
          <AlertTriangle className="size-3" aria-hidden="true" />
        ) : (
          index
        )}
      </span>
      <span className="flex-1">
        <span className={`font-semibold ${step.done ? 'text-ink-500' : 'text-ink-900'}`}>
          {step.label}
        </span>
        <span className="block text-tiny text-ink-500">
          {/* A rejected check is not the same as an unstarted one. Say which.
              And when their side is done but ours is not, say that too. */}
          {step.failed
            ? 'Needs attention — please redo this step'
            : (step.note ?? step.hint)}
        </span>
      </span>
      {!step.done && step.href ? (
        <span className="mt-0.5 shrink-0 text-tiny font-semibold text-brand-700">
          {step.failed ? 'Fix' : 'Start'} →
        </span>
      ) : null}
    </>
  );

  const cls = 'flex items-start gap-3 border-b border-dashed border-border py-2 text-meta last:border-b-0';

  return (
    <li>
      {!step.done && step.href ? (
        <Link href={step.href} className={`${cls} -mx-2 rounded px-2 hover:bg-ink-50`}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
