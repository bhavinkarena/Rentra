'use client';

import Link from 'next/link';
import {
  AlertTriangle, Check, ChevronDown, ListChecks,
} from 'lucide-react';

/** Five compact chapter segments used in the pinned wizard header. */
export function ChapterBar({ chapters, hrefs = {} }) {
  return (
    <div className="px-4 pb-2.5 sm:px-6">
      <ol className="flex gap-1.5">
        {chapters.map((chapter) => {
          const href = hrefs[chapter.id];
          const fill = Math.round((chapter.done / chapter.total) * 100);

          const track = (
            <>
              <span
                className={`block h-1.5 overflow-hidden rounded-full transition-colors ${
                  chapter.isCurrent ? 'bg-brand-200' : 'bg-ink-200'
                }`}
              >
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ease-out ${
                    chapter.failed ? 'bg-danger' : 'bg-brand-600'
                  }`}
                  style={{ width: `${fill}%` }}
                />
              </span>
              <span
                className={`mt-1.5 hidden truncate text-tiny sm:flex sm:items-center sm:gap-1 ${
                  chapter.isCurrent
                    ? 'font-semibold text-ink-900'
                    : chapter.failed
                      ? 'font-medium text-danger'
                      : 'text-ink-500'
                }`}
              >
                {chapter.failed ? (
                  <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                ) : chapter.complete ? (
                  <Check className="size-3 shrink-0 text-brand-600" aria-hidden="true" />
                ) : null}
                {chapter.label}
              </span>
            </>
          );

          return (
            <li key={chapter.id} className="min-w-0 flex-1">
              {href ? (
                <Link
                  href={href}
                  aria-current={chapter.isCurrent ? 'step' : undefined}
                  className="block rounded focus-visible:outline-none"
                  title={`${chapter.label} — ${chapter.done} of ${chapter.total} done`}
                >
                  {track}
                </Link>
              ) : (
                <span className="block" aria-current={chapter.isCurrent ? 'step' : undefined}>
                  {track}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusIcon({ step }) {
  if (step.failed) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-danger-bg text-danger">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Needs attention</span>
      </span>
    );
  }

  if (step.done) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
        <Check className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Complete</span>
      </span>
    );
  }

  if (step.isCurrent) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-800 ring-1 ring-inset ring-brand-300">
        <span className="size-2 rounded-full bg-brand-600" aria-hidden="true" />
        <span className="sr-only">Current step</span>
      </span>
    );
  }

  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-100 text-[0.65rem] font-bold text-ink-500">
      {step.index}
      <span className="sr-only">Not started</span>
    </span>
  );
}

function ProgressList({ progress, stepHrefs = {} }) {
  return (
    <ol className="mt-5 space-y-5">
      {progress.chapters.map((chapter) => (
        <li key={chapter.id}>
          <div className="flex items-center justify-between gap-3 px-1">
            <p className={`text-[0.65rem] font-bold tracking-[0.11em] uppercase ${
              chapter.isCurrent ? 'text-brand-700' : 'text-ink-400'
            }`}>
              {chapter.label}
            </p>
            <span className="text-[0.65rem] font-semibold text-ink-400 tabular">
              {chapter.done}/{chapter.total}
            </span>
          </div>

          <ol className="mt-1.5 space-y-1">
            {chapter.steps.map((step) => {
              const href = stepHrefs[step.id];
              const row = (
                <>
                  <StatusIcon step={step} />
                  <span className="min-w-0 flex-1 truncate">{step.label}</span>
                  {step.isCurrent ? (
                    <span className="text-[0.62rem] font-bold tracking-wide text-brand-700 uppercase">
                      Current
                    </span>
                  ) : null}
                </>
              );
              const classes = `flex min-h-9 items-center gap-2.5 rounded-md border-l-2 px-2.5 py-1.5 text-tiny transition-colors ${
                step.isCurrent
                  ? 'border-brand-600 bg-brand-50 font-semibold text-ink-900'
                  : step.failed
                    ? 'border-danger bg-danger-bg/50 font-semibold text-danger'
                    : 'border-transparent text-ink-600'
              }`;

              return (
                <li key={step.id}>
                  {href ? (
                    <Link
                      href={href}
                      aria-current={step.isCurrent ? 'step' : undefined}
                      className={`${classes} hover:bg-ink-50 hover:text-ink-900`}
                    >
                      {row}
                    </Link>
                  ) : (
                    <span className={classes} aria-current={step.isCurrent ? 'step' : undefined}>
                      {row}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function OverallProgress({ progress }) {
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-meta font-bold text-ink-900">Setup progress</p>
          <p className="mt-0.5 text-tiny text-ink-500">
            {progress.doneCount} of {progress.doneTotal} sections complete
          </p>
        </div>
        <p className="text-h4 font-bold text-brand-700 tabular">{progress.percent}%</p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-label="Property setup completion"
        aria-valuemin={0}
        aria-valuemax={progress.doneTotal}
        aria-valuenow={progress.doneCount}
      >
        <span
          className="block h-full rounded-full bg-brand-600 transition-[width] duration-700 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </>
  );
}

/** Full grouped navigator on desktop. */
export function StepRail({ progress, stepHrefs = {} }) {
  return (
    <aside className="hidden lg:block" aria-label="Property setup steps">
      <div className="sticky top-6 rounded-xl border border-border bg-card p-4 shadow-xs">
        <OverallProgress progress={progress} />
        <ProgressList progress={progress} stepHrefs={stepHrefs} />
      </div>
    </aside>
  );
}

/** Compact disclosure keeps all ten labels available without crowding mobile. */
export function MobileStepDisclosure({ progress, stepHrefs = {} }) {
  return (
    <details className="group mb-4 rounded-lg border border-border bg-card shadow-xs lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-meta font-semibold text-ink-800 [&::-webkit-details-marker]:hidden">
        <ListChecks className="size-4 text-brand-700" aria-hidden="true" />
        <span className="flex-1">All setup steps</span>
        <span className="text-tiny font-medium text-ink-500 tabular">
          {progress.doneCount}/{progress.doneTotal}
        </span>
        <ChevronDown className="size-4 text-ink-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-border px-4 py-4">
        <OverallProgress progress={progress} />
        <ProgressList progress={progress} stepHrefs={stepHrefs} />
      </div>
    </details>
  );
}
