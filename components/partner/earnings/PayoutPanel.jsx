'use client';
import { useState } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';

export default function PayoutPanel({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <aside
      className="flex flex-col rounded-lg border border-border bg-card p-5 sm:p-6"
      aria-labelledby="payout-readiness-title"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="payout-readiness-title" className="text-h4 font-semibold text-ink-900">
          Payouts
        </h2>
        <Wallet className="hidden size-5 text-ink-500 xl:block" aria-hidden="true" />
        <button
          type="button"
          aria-expanded={open}
          aria-controls="payout-readiness-details"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-tiny font-medium text-ink-600 xl:hidden"
        >
          Not active yet
          <ChevronDown className={`size-4 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
      <div id="payout-readiness-details" className={open ? '' : 'hidden xl:block'}>
        {children}
      </div>
    </aside>
  );
}
