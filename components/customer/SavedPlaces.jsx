'use client';
import Link from 'next/link';
import { startTransition } from 'react';
import { useSavedPlaces } from './SavedPlacesProvider';
import { formatLocalDate } from '@/lib/domain/booking-dates';

export default function SavedPlaces() {
  const saved=useSavedPlaces();
  return <div className="space-y-6">
    <h1 className="text-h1">Saved places</h1>
    {saved.mode==='guest' ? <p className="text-body text-ink-600">Your saved places stay in this browser. <Link href="/login" className="text-brand-700 underline">Log in</Link> to keep them across devices.</p> : null}
    {saved.mode==='other' ? <p>Saved accounts are for customers. <Link href="/login" className="text-brand-700 underline">Switch to customer login</Link> to continue.</p> : null}
    {saved.error ? <div role="alert" className="rounded-md border border-danger p-4"><p>{saved.error}</p><button onClick={saved.refresh} className="min-h-11 text-brand-700 underline">Retry saved places</button></div> : null}
    {!saved.ready && !saved.error ? <p role="status">Loading saved places…</p> : null}
    {saved.ready && saved.mode!=='other' && !saved.entries.length ? <p>Save places you’d love to visit using the heart on a listing.</p> : null}
    <ul className="grid gap-4 sm:grid-cols-2">
      {(saved.entries ?? []).map(entry=><li key={entry.rentableId} className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-h3">{entry.available ? <Link href={entry.href} className="hover:underline">{entry.title}</Link> : entry.title}</h2>
        {entry.available ? <p className="mt-2 text-meta text-ink-600">{entry.area}</p> : <p className="mt-2 text-meta text-ink-600">{entry.detailsUnavailable ? 'Details could not load. Your save is still kept.' : 'This listing is no longer publicly available.'}</p>}
        {entry.selection ? <p className="mt-3 text-meta">{entry.selection.dates.map(formatLocalDate).join(' · ')}<br/>{entry.selection.slot.replaceAll('_',' ')} · {entry.selection.guests} guests</p> : null}
        {entry.available ? <p className="mt-3 text-tiny text-ink-500">Check the listing for current prices and availability.</p> : null}
        <button disabled={saved.busy} onClick={()=>startTransition(()=>saved.change(entry.rentableId,false))} className="mt-3 min-h-11 text-meta font-semibold text-brand-700 underline">Remove<span className="sr-only"> {entry.title}</span></button>
      </li>)}
    </ul>
    <Link href="/" className="inline-flex min-h-11 items-center text-brand-700 underline">Explore places</Link>
  </div>;
}
