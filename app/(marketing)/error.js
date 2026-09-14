'use client';
import Link from 'next/link';
export default function DiscoveryError({ reset }) {
  return <section className="mx-auto max-w-xl px-6 py-12"><h1 className="text-h2">This page is temporarily unavailable</h1><p className="my-4">Please retry. Your search filters remain in the address bar.</p><button className="rounded-full bg-brand-600 px-5 py-3 text-white" onClick={reset}>Try again</button> <Link className="underline" href="/search">Start a new search</Link></section>;
}
