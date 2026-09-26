'use client';
import Link from 'next/link';
import { ReceiptText, RefreshCw, TriangleAlert } from 'lucide-react';
export default function CheckoutError({ reset }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-warning-bg text-warning">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-h2">Checkout could not load</h1>
      <p className="mt-2 text-sm text-ink-600">
        Your payment may still be processing. Reload this checkout to recover its status before
        creating another booking.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/bookings"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          <ReceiptText className="size-4" aria-hidden="true" />
          Find recent test checkouts
        </Link>
      </div>
    </div>
  );
}
