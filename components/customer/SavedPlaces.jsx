'use client';
import RentraLoader from '@/components/ui/rentra-loader';
import Link from '@/components/navigation/NavigationLink';
import Image from '@/components/rentra/PropertyImage';
import { startTransition } from 'react';
import { useSavedPlaces } from './SavedPlacesProvider';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { SLOTS } from '@/lib/domain/pricing';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';
import { CalendarDays, Compass, Heart, HeartOff, MapPin, RefreshCw } from 'lucide-react';

export default function SavedPlaces() {
  const saved = useSavedPlaces();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1">Saved places</h1>
        {saved.entries?.length ? (
          <Link
            href="/"
            className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full px-4')}
          >
            <Compass aria-hidden="true" />
            Explore places
          </Link>
        ) : null}
      </header>
      {saved.mode === 'guest' ? (
        <p className="text-meta text-ink-600">
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
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-bg p-4 text-meta"
        >
          <p>{saved.error}</p>
          <button
            onClick={saved.refresh}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
          >
            <RefreshCw aria-hidden="true" />
            Retry saved places
          </button>
        </div>
      ) : null}
      {!saved.ready && !saved.error ? (
        <RentraLoader variant="page" label="Loading saved places" />
      ) : null}
      {saved.ready && saved.mode !== 'other' && !saved.entries.length ? (
        <EmptyState
          icon={Heart}
          title="No saved places yet"
          description="Save places you’d love to visit using the heart on a listing."
        >
          <Link href="/" className={cn(buttonVariants(), 'rounded-full px-5')}>
            <Compass aria-hidden="true" />
            Explore places
          </Link>
        </EmptyState>
      ) : null}
      <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {(saved.entries ?? []).map((entry) => (
          <li key={entry.rentableId} className="group">
            {entry.available && entry.photo ? (
              <Link
                href={entry.href}
                className="relative block aspect-4/3 overflow-hidden rounded-lg bg-ink-100"
              >
                <Image
                  src={entry.photo.url}
                  alt={entry.photo.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]"
                />
              </Link>
            ) : (
              <div className="grid aspect-4/3 place-items-center rounded-lg bg-ink-100 text-tiny font-semibold tracking-widest text-ink-500 uppercase">
                {entry.available ? 'Photo pending' : 'Unavailable'}
              </div>
            )}
            <div className="pt-3">
              <p className="flex items-center gap-1 text-meta text-ink-600">
                <MapPin className="size-3.5 text-brand-600" aria-hidden="true" />
                {entry.available ? entry.area : 'Saved place'}
              </p>
              <h2 className="mt-0.5 text-h4">
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
                <p className="mt-2 flex items-start gap-2 rounded-md bg-brand-50 p-2.5 text-meta text-ink-800">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-brand-700"
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{entry.selection.dates.map(formatLocalDate).join(' · ')}</strong>
                    <br />
                    {SLOTS[entry.selection.slot]?.label ?? 'Overnight'} · {entry.selection.guests}{' '}
                    {entry.selection.guests === 1 ? 'guest' : 'guests'}
                  </span>
                </p>
              ) : null}
              {entry.available ? (
                <p className="mt-2 text-tiny text-ink-500">
                  Open the place to check current prices and availability.
                </p>
              ) : null}
              <button
                disabled={saved.busy}
                onClick={() => startTransition(() => saved.change(entry.rentableId, false))}
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 -ml-3 text-meta font-semibold text-ink-700 transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50"
              >
                <HeartOff className="size-4" aria-hidden="true" />
                Remove<span className="sr-only"> {entry.title}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
