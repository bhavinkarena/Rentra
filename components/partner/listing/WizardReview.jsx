import Link from 'next/link';
import { Check, AlertTriangle, Circle } from 'lucide-react';
import { LISTING_CHAPTERS, stepHref } from '@/lib/domain/listing-steps';
import { SubmitBar } from './ListingSections';

/**
 * The last step. No input — it exists so the walkthrough has an ending.
 *
 * Two jobs:
 *   · show the whole thing at once, which is the first time they see it as a
 *     listing rather than as a sequence of questions
 *   · make every gap a LINK. The submit bar on the manage page names what is
 *     missing in prose; here each gap is one tap from being fixed, because
 *     this is the screen where somebody is trying to finish.
 */
export default function WizardReview({ listingId, listing, completion, submitAction }) {
  const bySection = new Map(completion.sections.map((s) => [s.id, s]));

  return (
    <section>
      <h1 className="text-h1">
        {completion.canSubmit ? 'Ready to send' : 'Almost there'}
      </h1>
      <p className="mt-2 max-w-prose text-body text-ink-600">
        {completion.canSubmit
          ? 'Have a last look, then send it to us. We check every property before it goes live — 2 working days, by email and WhatsApp.'
          : 'A few things still need finishing. Tap any of them to go straight there.'}
      </p>

      <div className="mt-7 space-y-4">
        {LISTING_CHAPTERS.map((chapter) => {
          const rows = chapter.steps.filter((s) => bySection.has(s.id));
          if (rows.length === 0) return null;

          return (
            <div key={chapter.id} className="rounded-lg border border-border bg-card">
              <p className="border-b border-border px-4 py-2.5 text-tiny font-bold tracking-wider text-brand-700 uppercase">
                {chapter.label}
              </p>
              <ul>
                {rows.map((s) => {
                  const section = bySection.get(s.id);
                  return (
                    <li key={s.id} className="border-b border-dashed border-border last:border-b-0">
                      <Link
                        href={stepHref(listingId, s.id)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50"
                      >
                        <span
                          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                            section.failed
                              ? 'bg-danger text-white'
                              : section.done
                                ? 'bg-brand-600 text-white'
                                : 'bg-ink-200 text-ink-600'
                          }`}
                        >
                          {section.failed ? (
                            <AlertTriangle className="size-3" aria-hidden="true" />
                          ) : section.done ? (
                            <Check className="size-3" aria-hidden="true" />
                          ) : (
                            <Circle className="size-2" aria-hidden="true" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-meta font-semibold text-ink-900">
                            {section.label}
                          </span>
                          <span
                            className={`block text-tiny ${
                              section.failed ? 'font-medium text-danger' : 'text-ink-500'
                            }`}
                          >
                            {section.note ?? section.hint}
                          </span>
                        </span>

                        <span className="mt-0.5 shrink-0 text-tiny font-semibold text-brand-700">
                          {section.failed ? 'Fix' : section.done ? 'Edit' : 'Add'} →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <SubmitBar listing={listing} completion={completion} submitAction={submitAction} />
      </div>

      <p className="mt-5 text-center text-tiny text-ink-500">
        Prefer the one-page view?{' '}
        <Link
          href={`/partner/listings/${listingId}`}
          className="font-semibold text-brand-700 underline underline-offset-2"
        >
          Edit everything on one screen
        </Link>
      </p>
    </section>
  );
}
