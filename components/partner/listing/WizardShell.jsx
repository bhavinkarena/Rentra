'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, AlertTriangle } from 'lucide-react';
import { ListingChrome, STEP_FORM_ID } from './chrome';

/**
 * The full-screen listing walkthrough.
 *
 * Layout decisions, and why:
 *
 * · The primary action is a STICKY BOTTOM BAR, not a button at the end of the
 *   form. Owners fill this in on a phone, one-handed, and the bottom of the
 *   screen is the only place a thumb reliably reaches. It also means Continue
 *   is visible without scrolling on a long step like pricing.
 *
 * · Progress is SEGMENTED BY CHAPTER — five segments, not a single 0-100 bar.
 *   "2 of 5 · The space" is a number someone can hold in their head; "40%"
 *   is not. Completed chapters are clickable, so the walkthrough doubles as
 *   random access once you have been through it.
 *
 * · Nothing traps. "Skip for now" is always there except on the last step.
 *   The submit gate at the end still requires every section, so skipping
 *   costs nothing and forcing someone to produce a 7/12 extract before they
 *   can see the next question costs a listing.
 *
 * · Save and exit is always safe. Every step saves on Continue and the
 *   uploads save themselves, so there is never unsaved work to warn about.
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
      {/* min-h keeps short steps from leaving the bar floating mid-screen */}
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pt-6 pb-10">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-tiny font-bold tracking-wider text-brand-700 uppercase">
              {progress.chapterLabel}
              <span className="ml-2 font-medium text-ink-400 normal-case tracking-normal">
                Chapter {progress.chapterNumber} of {progress.chapterTotal}
              </span>
            </p>
            <Link
              href={`/partner/listings/${listingId}`}
              className="shrink-0 text-tiny font-semibold text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-900"
            >
              Save and exit
            </Link>
          </div>

          <div className="mt-6 flex-1">{children}</div>
        </div>

        {/* ---------------------------- sticky bar ---------------------------- */}
        <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <ChapterBar chapters={progress.chapters} hrefs={chapterHrefs} />

          <div
            className="mx-auto flex w-full max-w-2xl items-center gap-3 px-6 py-3.5"
            /* iOS home-bar inset — without this the buttons sit under it. */
            style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
          >
            {prevHref ? (
              <Link
                href={prevHref}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2.5 text-meta font-semibold text-ink-700 underline decoration-ink-300 underline-offset-4 hover:text-ink-900 hover:decoration-ink-600"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Link>
            ) : (
              <span />
            )}

            <p className="ml-auto hidden text-tiny text-ink-500 tabular sm:block">
              Step {progress.stepNumber} of {progress.stepTotal}
              {progress.minutesLeft > 0 ? ` · about ${progress.minutesLeft} min left` : null}
            </p>

            {continueLabel ? (
              <button
                type={isSubmitStep ? 'submit' : 'button'}
                /* Submits the section's form from outside it. The id is only
                   applied in wizard mode, so it is unique on this page. */
                form={isSubmitStep ? STEP_FORM_ID : undefined}
                onClick={isSubmitStep ? undefined : () => handleSaved()}
                disabled={busy}
                className="inline-flex shrink-0 items-center gap-2 rounded-md bg-brand-600 px-5 py-3 text-meta font-semibold text-white transition-colors hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500 sm:ml-3"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? 'Saving…' : continueLabel}
                {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
              </button>
            ) : null}
          </div>

          {/* Never trap. Somebody without the document to hand should still be
              able to see the rest of the flow. */}
          {nextHref ? (
            <div className="mx-auto -mt-1 w-full max-w-2xl px-6 pb-3">
              <Link
                href={nextHref}
                className="text-tiny font-medium text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-900"
              >
                Skip for now
              </Link>
            </div>
          ) : null}
        </div>
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
    <div className="mx-auto w-full max-w-2xl px-6 pt-3">
      <ol className="flex gap-1.5">
        {chapters.map((c) => {
          const href = hrefs[c.id];
          const fill = Math.round((c.done / c.total) * 100);

          const track = (
            <>
              <span
                className={`block h-1.5 overflow-hidden rounded-full ${
                  c.isCurrent ? 'bg-brand-200' : 'bg-ink-200'
                }`}
              >
                <span
                  className={`block h-full rounded-full transition-[width] duration-300 ${
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
