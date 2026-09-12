'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { RentraLogo } from '@/components/rentra/Logo';
import { ListingChrome, STEP_FORM_ID } from './chrome';
import { ChapterBar, MobileStepDisclosure, StepRail } from './WizardProgress';

/** Full-screen, one-question-at-a-time property setup. */
export default function WizardShell({
  listingId,
  step,
  progress,
  nextHref,
  prevHref,
  chapterHrefs = {},
  stepHrefs = {},
  children,
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [heldBack, setHeldBack] = useState(false);

  /**
   * A section reports success only after its server action validates and
   * saves. Trust-field edits on a live listing stay put once so their review
   * warning is visible before the owner moves on.
   */
  const handleSaved = useCallback((state) => {
    if (!nextHref) return;
    if (state?.sentBack) {
      setHeldBack(true);
      return;
    }
    setAdvancing(true);
    router.push(nextHref);
  }, [nextHref, router]);

  const busy = pending || advancing;
  const isSubmitStep = step.advance === 'submit' && !heldBack;
  const isLastStep = !nextHref;
  const continueLabel = isLastStep
    ? null
    : heldBack
      ? 'Saved — continue'
      : step.id === 'ownership'
        ? 'Check and send'
        : isSubmitStep
          ? 'Save and continue'
          : 'Continue';

  return (
    <ListingChrome variant="wizard" onSaved={handleSaved} onPending={setPending}>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <header className="z-30 shrink-0 border-b border-border bg-card">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <RentraLogo className="h-6 w-auto shrink-0" />
            <span className="hidden h-4 w-px shrink-0 bg-ink-200 sm:block" aria-hidden="true" />

            <p className="min-w-0 flex-1 truncate text-tiny font-bold tracking-wider text-brand-700 uppercase">
              {progress.chapterLabel}
              <span className="ml-2 hidden font-medium tracking-normal text-ink-400 normal-case sm:inline">
                Chapter {progress.chapterNumber} of {progress.chapterTotal}
              </span>
              <span className="ml-2 font-medium tracking-normal text-ink-400 normal-case sm:hidden">
                Step {progress.stepNumber} of {progress.stepTotal}
              </span>
            </p>

            <p className="hidden shrink-0 text-tiny text-ink-500 tabular md:block">
              Step {progress.stepNumber} of {progress.stepTotal}
              {progress.minutesLeft > 0 ? ` · ~${progress.minutesLeft} min left` : null}
            </p>

            <Link
              href={`/partner/listings/${listingId}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-tiny font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Exit setup</span>
            </Link>
          </div>

          <nav aria-label="Property setup progress">
            <ChapterBar chapters={progress.chapters} hrefs={chapterHrefs} />
          </nav>
        </header>

        <main
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          aria-label="Current property setup step"
        >
          <div
            key={step.id}
            className="mx-auto grid w-full max-w-[1180px] animate-in gap-6 px-4 pt-5 pb-16 duration-500 ease-out fade-in slide-in-from-bottom-4 sm:px-6 sm:pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8"
          >
            <StepRail progress={progress} stepHrefs={stepHrefs} />
            <div className="min-w-0">
              <MobileStepDisclosure progress={progress} stepHrefs={stepHrefs} />
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-8 lg:p-10">
                {children}
              </div>
            </div>
          </div>
        </main>

        <footer
          data-wizard-actions
          className="z-30 shrink-0 border-t border-border bg-card/95 backdrop-blur"
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-6 lg:pl-[300px] lg:pr-8">
            {prevHref ? (
              <Link
                href={prevHref}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2.5 text-meta font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            ) : (
              <span className="w-2" />
            )}

            {nextHref ? (
              <Link
                href={nextHref}
                className="shrink-0 text-tiny font-medium text-ink-500 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-900"
              >
                Skip for now
              </Link>
            ) : null}

            {isSubmitStep && !busy ? (
              <p className="hidden text-tiny text-ink-400 md:block">Changes save when you continue</p>
            ) : null}

            {continueLabel ? (
              <button
                type={isSubmitStep ? 'submit' : 'button'}
                form={isSubmitStep ? STEP_FORM_ID : undefined}
                onClick={isSubmitStep ? undefined : () => handleSaved()}
                disabled={busy}
                className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-meta font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? (pending ? 'Saving…' : 'Opening next step…') : continueLabel}
                {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </ListingChrome>
  );
}
