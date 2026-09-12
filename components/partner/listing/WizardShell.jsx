'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { RentraLogo } from '@/components/rentra/Logo';
import { ListingChrome, STEP_FORM_ID } from './chrome';

/**
 * The full-screen listing walkthrough.
 *
 * Layout decisions, and why:
 *
 * · It owns the WHOLE VIEWPORT — `h-dvh`, three rows, and only the middle one
 *   scrolls. The dynamic viewport unit rather than `100vh` because on mobile
 *   Safari `100vh` is taller than the visible area, which put the Continue
 *   button underneath the browser's own chrome.
 *
 * · PROGRESS IS AT THE TOP, pinned under the identity bar and running edge to
 *   edge. It is the answer to "how much more of this is there", which is the
 *   question people ask before they decide to keep going — so it belongs where
 *   the eye lands first, not below the fold at the bottom of a form.
 *
 * · Progress is SEGMENTED BY CHAPTER — five segments, not a single 0-100 bar.
 *   "2 of 5 · The space" is a number someone can hold in their head; "40%" is
 *   not. Completed chapters are clickable, so the walkthrough doubles as
 *   random access once you have been through it.
 *
 * · The primary action is a STICKY BOTTOM BAR, not a button at the end of the
 *   form. Owners fill this in on a phone, one-handed, and the bottom of the
 *   screen is the only place a thumb reliably reaches.
 *
 * · Nothing traps. "Skip for now" is always there except on the last step. The
 *   submit gate at the end still requires every section, so skipping costs
 *   nothing and forcing someone to produce a 7/12 extract before they can see
 *   the next question costs a listing.
 */
export default function WizardShell({
  listingId,
  step,          // { id, label, advance }
  progress,      // from wizardProgress()
  nextHref,      // string | null
  prevHref,      // string | null
  chapterHrefs,  // { [chapterId]: href }
  children,
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [heldBack, setHeldBack] = useState(false);

  /**
   * Advance only after the section reports a successful save. A validation
   * failure returns errors instead, so the step stays put with its message —
   * which is the whole reason this is a callback and not an optimistic push.
   *
   * The one save that must NOT auto-advance is `sentBack`: editing a trust
   * field on a LIVE listing pulls it out of search until we re-check it. That
   * warning renders inside the section, so sliding straight to the next step
   * would take a listing out of search and never tell the owner why. Hold
   * position, show the warning, and turn Continue into a plain link so a
   * second press moves on instead of re-submitting the same edit.
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
  // Once held back, the edit is already saved — Continue is navigation only.
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

        {/* ============================ TOP ============================ */}
        <header className="z-30 shrink-0 border-b border-border bg-card">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <RentraLogo className="h-6 w-auto shrink-0" />
            <span className="hidden h-4 w-px shrink-0 bg-ink-200 sm:block" aria-hidden="true" />

            <p className="min-w-0 flex-1 truncate text-tiny font-bold tracking-wider text-brand-700 uppercase">
              {progress.chapterLabel}
              <span className="ml-2 font-medium tracking-normal text-ink-400 normal-case">
                Chapter {progress.chapterNumber} of {progress.chapterTotal}
              </span>
            </p>

            <p className="hidden shrink-0 text-tiny tabular text-ink-500 md:block">
              Step {progress.stepNumber} of {progress.stepTotal}
              {progress.minutesLeft > 0 ? ` · ~${progress.minutesLeft} min left` : null}
            </p>

            <Link
              href={`/partner/listings/${listingId}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-tiny font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Save and exit</span>
            </Link>
          </div>

          {/* Progress, edge to edge — no gutters, so it reads as the top of the
              screen rather than as another element inside a column. */}
          <ChapterBar chapters={progress.chapters} hrefs={chapterHrefs} />
        </header>

        {/* =========================== MIDDLE =========================== */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/*
            `key` on the step id remounts on every navigation, which is what
            makes the transition fire per step instead of once per session.
          */}
          <div
            key={step.id}
            className="mx-auto w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 px-4 pt-7 pb-16 duration-500 ease-out sm:px-8 sm:pt-10"
          >
            {children}
          </div>
        </main>

        {/* =========================== BOTTOM =========================== */}
        <footer
          className="z-30 shrink-0 border-t border-border bg-card/95 backdrop-blur"
          /* iOS home-bar inset — without this the buttons sit under it. */
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6">
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

            {/* Never trap. Somebody without the document to hand should still
                be able to see the rest of the flow. */}
            {nextHref ? (
              <Link
                href={nextHref}
                className="shrink-0 text-tiny font-medium text-ink-500 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-900"
              >
                Skip for now
              </Link>
            ) : null}

            {continueLabel ? (
              <button
                type={isSubmitStep ? 'submit' : 'button'}
                /* Submits the section's form from outside it. The id is only
                   applied in wizard mode, so it is unique on this page. */
                form={isSubmitStep ? STEP_FORM_ID : undefined}
                onClick={isSubmitStep ? undefined : () => handleSaved()}
                disabled={busy}
                className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-meta font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow active:scale-[0.98] disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? 'Saving…' : continueLabel}
                {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </ListingChrome>
  );
}

/**
 * One segment per chapter, filled by how much of that chapter is done.
 *
 * Position and completion are deliberately different signals: the current
 * chapter is outlined, complete ones are solid, and a rejected section turns
 * its chapter red. A single bar cannot say all three at once.
 */
function ChapterBar({ chapters, hrefs }) {
  return (
    <div className="px-4 pb-2.5 sm:px-6">
      <ol className="flex gap-1.5">
        {chapters.map((c) => {
          const href = hrefs[c.id];
          const fill = Math.round((c.done / c.total) * 100);

          const track = (
            <>
              <span
                className={`block h-1.5 overflow-hidden rounded-full transition-colors ${
                  c.isCurrent ? 'bg-brand-200' : 'bg-ink-200'
                }`}
              >
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ease-out ${
                    c.failed ? 'bg-danger' : 'bg-brand-600'
                  }`}
                  style={{ width: `${fill}%` }}
                />
              </span>
              <span
                className={`mt-1.5 hidden truncate text-tiny sm:flex sm:items-center sm:gap-1 ${
                  c.isCurrent
                    ? 'font-semibold text-ink-900'
                    : c.failed
                      ? 'font-medium text-danger'
                      : 'text-ink-500'
                }`}
              >
                {c.failed ? (
                  <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                ) : c.complete ? (
                  <Check className="size-3 shrink-0 text-brand-600" aria-hidden="true" />
                ) : null}
                {c.label}
              </span>
            </>
          );

          return (
            <li key={c.id} className="min-w-0 flex-1">
              {href ? (
                <Link
                  href={href}
                  aria-current={c.isCurrent ? 'step' : undefined}
                  className="block rounded focus-visible:outline-none"
                  title={`${c.label} — ${c.done} of ${c.total} done`}
                >
                  {track}
                </Link>
              ) : (
                <span className="block" aria-current={c.isCurrent ? 'step' : undefined}>
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
