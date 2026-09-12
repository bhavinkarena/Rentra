import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireActiveClient } from '@/lib/auth/dal';
import { getClientListings } from '@/lib/db/listing-queries';

export const metadata = {
  title: 'Your properties',
  robots: { index: false, follow: false, nocache: true },
};

const STATUS_TONE = {
  live: 'bg-brand-50 text-brand-700',
  pending_review: 'bg-amber-100 text-amber-700',
  pending_verification: 'bg-amber-100 text-amber-700',
  rejected: 'bg-danger-bg text-danger',
  paused: 'bg-ink-100 text-ink-600',
  hidden: 'bg-ink-100 text-ink-600',
  draft: 'bg-ink-100 text-ink-600',
};

const STATUS_HINT = {
  draft: 'Not submitted yet',
  pending_review: 'With Rentra — 2 working days',
  pending_verification: 'Verification visit being arranged',
  live: 'Visible to guests',
  paused: 'You paused this — no new bookings',
  hidden: 'Hidden by Rentra',
  rejected: 'Needs changes before it can go live',
};

export default async function ListingsPage({ searchParams }) {
  const user = await requireActiveClient();
  const params = await searchParams;
  const listings = await getClientListings(user.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {params?.submitted ? (
        <p className="mb-6 rounded-md border-l-4 border-brand-600 bg-success-bg p-3 text-meta text-brand-900">
          Submitted. We check every property before it goes live and will reply within 2 working
          days, by email and WhatsApp.
        </p>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-h1">Your properties</h1>
        <form action="/partner/listings/new">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-meta font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add a property
          </button>
        </form>
      </div>

      {listings.length === 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-h4 font-bold">No properties yet</p>
          <p className="mx-auto mt-1 max-w-prose text-meta text-ink-600">
            Adding one takes about 25 minutes, and you can stop and come back — nothing is lost.
            Photos are the part that matters most, so have 6 to 15 ready.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {listings.map((l) => (
            <li key={l.id}>
              <Link
                href={`/partner/listings/${l.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-ink-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta font-semibold text-ink-900">
                    {l.title === 'Untitled property' ? 'Untitled draft' : l.title}
                  </span>
                  <span className="block truncate text-tiny text-ink-500">
                    {l.areaName ? `${l.areaName}, ${l.cityName} · ` : ''}
                    {STATUS_HINT[l.status] ?? l.status}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-tiny font-bold ${STATUS_TONE[l.status] ?? 'bg-ink-100 text-ink-600'}`}>
                  {l.status.replace(/_/g, ' ')}
                </span>
              </Link>
              {l.status === 'rejected' && l.rejectionReason ? (
                <p className="border-t border-dashed border-border bg-danger-bg px-4 py-2 text-tiny text-danger">
                  {l.rejectionReason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
