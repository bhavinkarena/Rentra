import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Home, Plus, Search, Video } from 'lucide-react';
import { requireActiveClient } from '@/lib/auth/dal';
import { getListingForEdit } from '@/lib/db/listing-queries';
import { RentraLogo } from '@/components/rentra/Logo';

export const metadata = {
  title: 'Sent for review',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The ending.
 *
 * Dropping someone back onto a list with a one-line green banner after they
 * have spent twenty-five minutes photographing a farmhouse, typing a
 * description and digging out a 7/12 extract is the single most deflating
 * moment the product could offer. The walkthrough took the whole screen for
 * every question it asked; it takes the whole screen to answer.
 *
 * The three rows below are the actual pipeline from lib/db/schema — review,
 * then a video or physical visit, then publish — not reassurance invented for
 * this page. An owner who knows a video call is coming is an owner who answers
 * it.
 */
export default async function SubmittedPage({ params }) {
  const user = await requireActiveClient();
  const { id } = await params; // Next 16: params is a Promise

  // Scoped by clientId — another Client's listing id is a 404, not a peek.
  const data = await getListingForEdit(id, user.id);
  if (!data) notFound();

  const { listing } = data;

  const steps = [
    {
      Icon: Search,
      title: 'We check it',
      body: 'Your ownership document against your ID, the photos, and the price against the area. Two working days.',
      when: 'Now',
    },
    {
      Icon: Video,
      title: 'A walkthrough',
      body: 'Usually a scheduled video call where you walk us around. Free, and it takes about fifteen minutes.',
      when: 'Next',
    },
    {
      Icon: Home,
      title: 'It goes live',
      body: 'Your property enters search with a verified badge, and you can start taking bookings.',
      when: 'Then',
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card px-4 py-2.5 sm:px-6">
        <RentraLogo className="h-6 w-auto" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-2xl text-center">

          {/* ------------------------- the tick ------------------------- */}
          <div className="relative mx-auto grid size-20 place-items-center">
            <span
              className="absolute inset-0 animate-ripple rounded-full bg-brand-400"
              aria-hidden="true"
            />
            <span className="relative grid size-20 animate-in place-items-center rounded-full bg-brand-600 duration-500 zoom-in-50">
              <svg
                viewBox="0 0 52 52" className="size-10" fill="none"
                stroke="currentColor" strokeWidth="5"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M14 27l8.5 8.5L38 19"
                  className="animate-draw text-white"
                  style={{ '--draw-length': 40 }}
                />
              </svg>
            </span>
          </div>

          <p className="mt-7 animate-in text-tiny font-bold tracking-wider text-brand-700 uppercase duration-500 fade-in">
            Sent for review
          </p>
          <h1 className="mt-2 animate-in text-h1 delay-100 duration-500 fade-in slide-in-from-bottom-3">
            That is your property with us
          </h1>
          <p className="mx-auto mt-3 max-w-prose animate-in text-body text-ink-600 delay-150 duration-500 fade-in slide-in-from-bottom-3">
            <strong className="font-semibold text-ink-900">{listing.title}</strong> is in the
            queue. We reply within 2 working days either way, by email and WhatsApp — there is
            nothing else for you to do right now.
          </p>

          {/* ---------------------- what happens next ---------------------- */}
          <ol className="mt-9 space-y-2.5 text-left">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="flex animate-in items-start gap-4 rounded-xl border border-border bg-card p-4 duration-500 fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${250 + i * 110}ms`, animationFillMode: 'backwards' }}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <s.Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-meta font-bold text-ink-900">{s.title}</span>
                    <span className="text-tiny font-semibold tracking-wider text-ink-400 uppercase">
                      {s.when}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-meta text-ink-600">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <p
            className="mt-6 inline-flex animate-in items-center gap-1.5 text-tiny text-ink-500 duration-500 fade-in"
            style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            Most properties are reviewed well inside two days.
          </p>

          {/* ---------------------------- next ---------------------------- */}
          <div
            className="mt-8 flex animate-in flex-col justify-center gap-3 duration-500 fade-in sm:flex-row"
            style={{ animationDelay: '680ms', animationFillMode: 'backwards' }}
          >
            <Link
              href="/partner/listings"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-meta font-semibold text-white transition-all hover:bg-brand-700 active:scale-[0.98]"
            >
              See your properties
            </Link>
            <Link
              href="/partner/listings/new"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-input px-6 py-3 text-meta font-semibold text-ink-800 transition-colors hover:bg-ink-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add another property
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
