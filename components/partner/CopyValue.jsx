'use client';
import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A long reference shown short, with the full value one tap from the clipboard. */
export default function CopyValue({ value, label = 'Copy reference' }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-ink-100 py-0.5 pr-0.5 pl-2 text-tiny text-ink-700">
      <span className="truncate font-mono select-all" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          } catch {
            /* The value stays selectable when the clipboard is blocked. */
          }
        }}
        aria-label={copied ? 'Copied' : label}
        className="grid size-7 shrink-0 place-items-center rounded text-ink-600 hover:bg-ink-200 hover:text-ink-900"
      >
        {copied ? (
          <Check className="size-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Reference copied' : ''}
      </span>
    </span>
  );
}
