'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A compact, copyable identifier pill for detail headers. */
export default function CopyChip({ label, value, display }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          /* Clipboard blocked: the value stays visible and selectable. */
        }
      }}
      className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 text-tiny font-semibold text-brand-800 hover:bg-brand-100"
      aria-label={`Copy ${label}: ${value}`}
    >
      {copied ? (
        <Check className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate font-mono">{display ?? value}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ''}
      </span>
    </button>
  );
}
