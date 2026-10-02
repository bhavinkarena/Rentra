'use client';
import NavigationProgress from '@/components/navigation/NavigationProgress';
import Loader2 from '@/components/ui/rentra-loader';

import DraftSave from './DraftSave';
import UnsavedChangesGuard from '@/components/portal/UnsavedChangesGuard';
import { useCallback, useEffect, useState } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { RentraLogo } from '@/components/rentra/Logo';
import { ListingChrome, STEP_FORM_ID } from './chrome';
import { ChapterBar, MobileStepDisclosure, StepRail } from './WizardProgress';

/** Full-screen, one-question-at-a-time property setup. */
export default function WizardShell({
  listing,
  listingId,
  step,
  progress,
  nextHref,
  prevHref,
  chapterHrefs = {},
  stepHrefs = {},
  correction = null,
  children,
}) {
  const router = useRouter();
  // PROP-02: a Fix link (#field-name) lands on the field, focused and ringed for 2 s.
  useEffect(() => {
    const name = decodeURIComponent(window.location.hash.replace(/^#field-/, ''));
    if (!window.location.hash.startsWith('#field-')) return;
    const form = document.getElementById(STEP_FORM_ID);
    const field =
      document.getElementById(name) ||
      form?.querySelector('input:not([type=hidden]),select,textarea');
    if (!field) return;
    field.scrollIntoView({ block: 'center' });
    field.focus({ preventScroll: true });
    field.classList.add('ring-4', 'ring-warning/60');
    const timer = setTimeout(() => field.classList.remove('ring-4', 'ring-warning/60'), 2000);
    return () => clearTimeout(timer);
  }, []);
  const [pending, setPending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [heldBack, setHeldBack] = useState(false);

  /**
   * A section reports success only after its server action validates and
   * saves. Trust-field edits on a live listing stay put once so their review
   * warning is visible before the owner moves on.
   */
  const handleSaved = useCallback(
    (state) => {
      // Only submit steps advance on a section save; photo or document saves stay on the step.
      if (!nextHref || (step.advance !== 'submit' && !state?.manual)) return;
      if (state?.sentBack) {
        setHeldBack(true);
        return;
      }
      setAdvancing(true);
      router.push(nextHref);
    },
    [nextHref, router, step.advance],
  );

  const [version, setVersion] = useState(listing.contentVersion);
  const onVersion = useCallback((v, configVersion) => {
    if (v) setVersion((current) => Math.max(current || 0, v));
    const form = document.getElementById(STEP_FORM_ID);
    if (form?.elements.contentVersion && v) form.elements.contentVersion.value = v;
    if (form?.elements.expectedVersion && configVersion != null)
      form.elements.expectedVersion.value = configVersion;
  }, []);
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
    <ListingChrome version={version} variant="wizard" onSaved={handleSaved} onPending={setPending}>
      <UnsavedChangesGuard browserBack />
      <NavigationProgress active={advancing} />
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <header className="z-30 shrink-0 border-b border-border bg-card">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <RentraLogo className="h-6 w-auto shrink-0" />
            <span className="hidden h-4 w-px shrink-0 bg-ink-200 sm:block" aria-hidden="true" />

            <p className="min-w-0 flex-1 truncate text-meta font-semibold text-brand-800">
              {progress.chapterLabel}
              <span className="ml-2 hidden font-medium text-ink-600 sm:inline">
                Chapter {progress.chapterNumber} of {progress.chapterTotal}
              </span>
              <span className="ml-2 font-medium text-ink-600 sm:hidden">
                Step {progress.stepNumber} of {progress.stepTotal}
              </span>
            </p>

            <p className="hidden shrink-0 text-tiny text-ink-500 tabular md:block">
              Step {progress.stepNumber} of {progress.stepTotal}
              {progress.minutesLeft > 0 ? ` · ~${progress.minutesLeft} min left` : null}
            </p>

            <Link
              href={`/partner/listings/${listingId}`}
              aria-label="Exit setup"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-tiny font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
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
            className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 pt-5 pb-16 sm:px-6 sm:pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8"
          >
            <StepRail progress={progress} stepHrefs={stepHrefs} />
            <div className="min-w-0">
              <MobileStepDisclosure progress={progress} stepHrefs={stepHrefs} />
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-8 lg:p-10">
                <DraftSave
                  listing={listing}
                  step={step.id}
                  pending={pending}
                  onVersion={onVersion}
                />
                {correction ? (
                  <div
                    role="note"
                    className="mb-6 rounded-md border-l-4 border-warning bg-warning-bg p-3 text-meta text-ink-800"
                  >
                    <strong className="font-semibold text-warning">
                      Rentra asked you to change this step.
                    </strong>
                    {correction.reason ? ` ${correction.reason}` : ''}
                  </div>
                ) : null}
                {children}
              </div>
            </div>
          </div>
        </main>

        <footer
          data-wizard-actions
          className="z-30 shrink-0 border-t border-border bg-card"
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-6 lg:pl-[300px] lg:pr-8">
            {prevHref ? (
              <Link
                href={prevHref}
                aria-label="Back to previous setup step"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-meta font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
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
                className="inline-flex min-h-11 shrink-0 items-center text-tiny font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-900"
              >
                Skip for now
              </Link>
            ) : null}

            {isSubmitStep && !busy ? (
              <p className="hidden text-tiny text-ink-600 md:block">
                Draft changes save automatically
              </p>
            ) : null}

            {continueLabel ? (
              <button
                type={isSubmitStep ? 'submit' : 'button'}
                form={isSubmitStep ? STEP_FORM_ID : undefined}
                onClick={isSubmitStep ? undefined : () => handleSaved({ manual: true })}
                disabled={busy || (step.id === 'ownership' && !step.done)}
                className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-meta font-semibold text-white shadow-sm transition-[background-color,color,border-color,box-shadow,transform] hover:bg-primary-hover hover:shadow disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
              >
                {busy ? <Loader2 className="size-4 " aria-hidden="true" /> : null}
                {busy ? (
                  pending ? (
                    <span className="sr-only">Saving…</span>
                  ) : (
                    <span className="sr-only">Opening next step…</span>
                  )
                ) : (
                  continueLabel
                )}
                {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </ListingChrome>
  );
}
