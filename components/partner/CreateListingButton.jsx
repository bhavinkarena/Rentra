'use client';

import Link, { useLinkStatus } from 'next/link';
import { LoaderCircle, Plus } from 'lucide-react';

function LinkContent({ label, pendingLabel }) {
  const { pending } = useLinkStatus();

  return (
    <span className="inline-flex items-center gap-2" aria-live="polite">
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Plus className="size-4" aria-hidden="true" />
      )}
      {pending ? pendingLabel : label}
    </span>
  );
}

/**
 * Opening setup is navigation, not creation.
 *
 * Keeping this as a Link makes viewport prefetching and repeated visits safe:
 * no property row exists until the first valid setup form is submitted.
 */
export default function CreateListingButton({
  className = '',
  compact = false,
  label = 'Add property',
  pendingLabel = 'Opening setup…',
  variant = 'primary',
}) {
  const tone = variant === 'secondary'
    ? 'border border-input bg-card text-ink-800 hover:bg-ink-50'
    : 'border border-transparent bg-brand-600 text-white shadow-xs hover:bg-brand-700';

  return (
    <Link
      href="/partner/listings/new"
      className={`inline-flex items-center justify-center rounded-md font-semibold transition-colors ${tone} ${
        compact ? 'min-h-10 px-4 text-tiny' : 'min-h-11 px-5 text-meta'
      } ${className}`}
    >
      <LinkContent label={label} pendingLabel={pendingLabel} />
    </Link>
  );
}
