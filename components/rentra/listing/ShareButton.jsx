'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * A forwarded WhatsApp card is seen by more people than the homepage, so
 * sharing is a first-class control here, not an afterthought.
 *
 * Native share sheet where the browser has one (every Android this product
 * is actually browsed on), clipboard everywhere else.
 */
export default function ShareButton({ title, text }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // A dismissed share sheet is a cancel, not a failure — fall through
        // to the clipboard only if the sheet itself was unavailable.
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link');
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-meta font-semibold text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:bg-ink-50 hover:text-ink-900"
    >
      {copied ? (
        <Check className="size-4 text-brand-600" aria-hidden="true" />
      ) : (
        <Share2 className="size-4" aria-hidden="true" />
      )}
      Share
    </button>
  );
}
