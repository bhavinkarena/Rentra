'use client';
import Link from 'next/link';
export default function CheckoutError({ reset }) {
  return <div className="space-y-4"><h1 className="text-h1">Checkout could not load</h1><p>Your payment may still be processing. Reload this checkout to recover its status before creating another booking.</p><button onClick={reset} className="min-h-11 rounded-md bg-brand-600 px-5 text-white">Try again</button><Link href="/bookings" className="block min-h-11 text-brand-700 underline">Find recent Test checkouts</Link></div>;
}
