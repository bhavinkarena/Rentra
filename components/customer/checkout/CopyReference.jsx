'use client';
import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** The one string support will ask for, one tap from the clipboard. */
export default function CopyReference({ reference }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
    } catch {
      /* The reference stays selectable when the clipboard is blocked. */
    }
  }
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-card py-1.5 pr-1.5 pl-4 text-left">
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide text-ink-500 uppercase">
          Booking reference
        </span>
        <span className="block font-mono text-sm break-all text-ink-900 select-all">
          {reference}
        </span>
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Booking reference copied' : ''}
      </span>
    </div>
  );
}
