import Link from 'next/link';
import { CloudOff, FileQuestion, LockKeyhole } from 'lucide-react';
import RetryButton from './RetryButton';

const STATES = {
  unavailable: {
    icon: CloudOff,
    title: 'This page could not load',
    description:
      'Rentra could not reach the service. Nothing was changed. Your filters are kept — try again.',
    retry: true,
  },
  forbidden: {
    icon: LockKeyhole,
    title: 'You do not have access to this',
    description:
      'Your account does not have permission for this page. Contact a Rentra administrator if you need it.',
  },
  not_found: {
    icon: FileQuestion,
    title: 'Record not found',
    description: 'It may have been removed, or the link is wrong or belongs to another account.',
  },
};

/**
 * One explicit state for a list, detail or whole page:
 * `unavailable` (retry), `forbidden` or `not_found`. Empty lists keep their
 * existing list-specific empty components.
 *
 * Headings are real headings and the retryable state is announced, so a
 * screen-reader user hears why the content is missing instead of silence.
 */
export default function PortalState({
  kind = 'unavailable',
  title,
  description,
  action,
  backHref,
  backLabel = 'Go back',
  headingLevel = 1,
  onRetry,
  compact = false,
}) {
  const state = STATES[kind] ?? STATES.unavailable;
  const Icon = state.icon;
  const Heading = `h${headingLevel}`;
  return (
    <section
      role={kind === 'unavailable' ? 'alert' : undefined}
      className={`mx-auto max-w-xl text-center ${compact ? 'px-4 py-10' : 'px-4 py-16 sm:py-20'}`}
    >
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink-50 text-ink-500 ring-1 ring-border">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <Heading className="mt-4 text-h3 font-bold text-ink-900">{title ?? state.title}</Heading>
      {(description ?? state.description) ? (
        <p className="mx-auto mt-2 max-w-md text-meta leading-6 text-ink-600">
          {description ?? state.description}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {state.retry ? <RetryButton onRetry={onRetry} /> : null}
        {action}
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-meta font-semibold text-ink-700 hover:bg-ink-50"
          >
            {backLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
