'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, X } from 'lucide-react';
import CreateListingButton from '@/components/partner/CreateListingButton';

/**
 * "Add place for rent" is visible from the first second, because hiding it
 * hides the point of the product — a Client who cannot see what they are
 * working toward has no reason to finish the profile.
 *
 * The click has a right and a wrong form. Wrong: an enabled-looking button
 * and a generic "complete your profile first" toast, which reads as a failure
 * and names nothing. Right: a lock that sets the expectation BEFORE the click,
 * and a sheet naming the exact remaining steps with a deep link to each.
 *
 * Repeated clicks are logged: someone hammering a locked CTA has a property
 * ready and is stuck on paperwork, which is the strongest intent signal ops
 * will get. (See gap 12 in docs/rentra-role-flow.html.)
 */
export default function GatedAddPlaceButton({ unlocked, message, onLockedClick }) {
  const [open, setOpen] = useState(false);
  const [clicks, setClicks] = useState(0);

  if (unlocked) {
    return <CreateListingButton />;
  }

  function handleClick() {
    const next = clicks + 1;
    setClicks(next);
    setOpen(true);
    onLockedClick?.(next);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-ink-700 px-5 py-3 text-meta font-semibold text-white transition-colors hover:bg-ink-800"
      >
        <Lock className="size-4" aria-hidden="true" />
        Add place for rent
      </button>

      {open && message ? (
        <div className="mt-3 max-w-md rounded-lg border border-border bg-card p-4 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-h4 font-bold">{message.title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {message.items.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {message.items.map((item) => (
                <li key={item.label} className="flex items-baseline justify-between gap-3 text-meta">
                  <Link href={item.href} className="font-semibold text-brand-700 hover:underline">
                    {item.label}
                  </Link>
                  {item.minutes ? (
                    <span className="shrink-0 text-tiny text-ink-500">
                      {item.minutes} min
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-tiny text-ink-500">{message.body}</p>
        </div>
      ) : null}
    </div>
  );
}
