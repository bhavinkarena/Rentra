'use client';
import Link from 'next/link';
import Image from 'next/image';
import { startTransition } from 'react';
import { useSavedPlaces } from './SavedPlacesProvider';
import { formatLocalDate } from '@/lib/domain/booking-dates';

export default function SavedPlaces() {
  const saved = useSavedPlaces();
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Saved places</h1>
      {saved.mode === 'guest' ? (
        <p className="text-body text-ink-600">
          Your saved places stay in this browser.{' '}
          <Link href="/login" className="text-brand-700 underline">
            Log in
          </Link>{' '}
          to keep them across devices.
        </p>
      ) : null}
      {saved.mode === 'other' ? (
        <p>
          Saved accounts are for customers.{' '}
          <Link href="/login" className="text-brand-700 underline">
            Switch to customer login
          </Link>{' '}
          to continue.
        </p>
      ) : null}
      {saved.error ? (
        <div role="alert" className="rounded-md border border-danger p-4">
          <p>{saved.error}</p>
          <button onClick={saved.refresh} className="min-h-11 text-brand-700 underline">
            Retry saved places
          </button>
        </div>
      ) : null}
      {!saved.ready && !saved.error ? <p role="status">Loading saved places…</p> : null}
      {saved.ready && saved.mode !== 'other' && !saved.entries.length ? (
        <p>Save places you’d love to visit using the heart on a listing.</p>
      ) : null}
      <ul className="grid gap-6 sm:grid-cols-2">
        {(saved.entries ?? []).map((entry) => (
          <li
            key={entry.rentableId}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            {entry.available && entry.photo ? (
              <Link href={entry.href} className="relative block aspect-4/3 bg-ink-100">
                <Image
                  src={entry.photo.url}
                  alt={entry.photo.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </Link>
            ) : (
              <div className="grid aspect-4/3 place-items-center bg-ink-100 text-tiny font-semibold tracking-widest text-ink-400 uppercase">
                {entry.available ? 'Photo pending' : 'Unavailable'}
              </div>
            )}
            <div className="p-5">
              <p className="text-meta font-semibold text-ink-600">
                {entry.available ? entry.area : 'Saved place'}
              </p>
              <h2 className="mt-1 text-h3">
                {entry.available ? (
                  <Link href={entry.href} className="hover:underline">
                    {entry.title}
                  </Link>
                ) : (
                  entry.title
                )}
              </h2>
              {!entry.available ? (
                <p className="mt-2 text-meta text-ink-600">
                  {entry.detailsUnavailable
                    ? 'Details could not load. Your save is still kept.'
                    : 'This listing is no longer publicly available.'}
                </p>
              ) : null}
              {entry.selection ? (
                <p className="mt-3 rounded-md bg-brand-50 p-3 text-meta">
                  <strong>{entry.selection.dates.map(formatLocalDate).join(' · ')}</strong>
                  <br />
                  {entry.selection.slot === 'full_day'
                    ? 'Full day'
                    : entry.selection.slot === 'day'
                      ? 'Day visit'
                      : 'Overnight'}{' '}
                  · {entry.selection.guests} {entry.selection.guests === 1 ? 'guest' : 'guests'}
                </p>
              ) : null}
              {entry.available ? (
                <p className="mt-3 text-tiny text-ink-500">
                  Open the place to check current prices and availability.
                </p>
              ) : null}
              <button
                disabled={saved.busy}
                onClick={() => startTransition(() => saved.change(entry.rentableId, false))}
                className="mt-3 min-h-11 text-meta font-semibold text-brand-700 underline"
              >
                Remove<span className="sr-only"> {entry.title}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/" className="inline-flex min-h-11 items-center text-brand-700 underline">
        Explore places
      </Link>
    </div>
  );
}
