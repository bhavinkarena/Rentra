'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyListingUrl, shareListing, whatsappListingUrl } from '@/lib/domain/listing-share';

/**
 * A forwarded WhatsApp card is seen by more people than the homepage, so
 * sharing is a first-class control here, not an afterthought.
 *
 * Native share sheet where the browser has one (every Android this product
 * is actually browsed on), clipboard everywhere else.
 */
export default function ShareButton({ title, text, url }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const result = await shareListing(navigator, { title, text, url });
    if (result === 'copied') {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } else if (result === 'failed') toast.error('Could not share or copy the link');
  }

  return (
    <details className="group relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm px-2 py-1 text-meta font-semibold text-ink-700 underline decoration-ink-300 underline-offset-4 hover:bg-ink-50">
        <Share2 className="size-4" aria-hidden="true" /> Share
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-52 rounded-md border border-border bg-card p-2 shadow-lg">
        <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-meta font-semibold hover:bg-ink-50">
          {copied ? <Check className="size-4 text-brand-600" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
          Share from device
        </button>
        <button type="button" onClick={async () => {
          const result = await copyListingUrl(navigator.clipboard, url);
          if (result === 'copied') { setCopied(true); toast.success('Link copied'); }
          else toast.error('Could not copy the link');
        }} className="flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-meta font-semibold hover:bg-ink-50">
          <Copy className="size-4" aria-hidden="true" /> Copy link
        </button>
        <a href={whatsappListingUrl({ text, url })} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-sm px-3 text-meta font-semibold hover:bg-ink-50">
          <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
        </a>
      </div>
    </details>
  );
}
