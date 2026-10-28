'use client';
import toast from 'react-hot-toast';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { previewListingPause, toggleListingPause } from '@/lib/actions/partner';
import { addLocalDays, propertyToday } from '@/lib/domain/booking-dates';

// The specific reason (e.g. "This property changed…") before the generic validation summary.
const message = (result) =>
  Object.values(result?.errors ?? {})
    .flat()
    .join(' ') || result?.error;

const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

function Group({ title, note, items, total, render }) {
  return (
    <section className="rounded-md border border-border p-3">
      <h3 className="text-meta font-semibold text-ink-900">
        {title} ({total ?? items.length})
      </h3>
      <p className="mt-1 text-tiny text-ink-600">{note}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-tiny text-ink-800">
          {items.slice(0, 5).map((item) => (
            <li key={item.orderId}>{render(item)}</li>
          ))}
          {(total ?? items.length) > 5 ? <li>and {(total ?? items.length) - 5} more</li> : null}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * PROP-05 and Story 2.14 (FR-6): pausing shows what it keeps before the owner
 * confirms. "Stop new bookings only" keeps confirmed stays and every unpaid hold
 * until it is declined or expires. Cancelling upcoming stays is a separate
 * choice that is not offered yet. Resume is one press.
 */
export default function PauseButton({ listing }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('manual');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const paused = listing.status === 'paused';
  if (!['live', 'paused'].includes(listing.status)) return null;
  const today = propertyToday();
  const send = (action, until = '') =>
    start(async () => {
      const form = new FormData();
      form.set('id', listing.id);
      form.set('action', action);
      if (action === 'pause' && preview) form.set('expectedVersion', String(preview.version));
      if (until) form.set('until', until);
      const result = await toggleListingPause({}, form);
      if (message(result)) {
        setError(message(result));
        // A changed property needs a fresh preview before pausing.
        if (result.stale) setPreview(null);
      } else {
        setOpen(false);
        setError('');
        toast.success(action === 'pause' ? 'New bookings paused.' : 'Bookings resumed.');
        router.refresh();
      }
    });
  const openPreview = () => {
    setOpen(true);
    setError('');
    setPreview(null);
    start(async () => {
      const result = await previewListingPause(listing.id);
      if (message(result)) setError(message(result));
      else setPreview(result);
    });
  };
  const Icon = paused ? Play : Pause;
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => (paused ? send('resume') : openPreview())}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-60"
      >
        <Icon className="size-4" aria-hidden="true" />
        {pending && !open ? 'Saving…' : paused ? 'Resume bookings' : 'Pause bookings'}
      </button>
      {paused && error ? (
        <p role="alert" className="mt-1 text-tiny text-danger">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        title={`Pause bookings for ${listing.title}?`}
        confirmLabel="Stop new bookings"
        pending={pending || !preview}
        onCancel={() => setOpen(false)}
        onConfirm={(data) => send('pause', mode === 'date' ? String(data.get('until') || '') : '')}
      >
        <fieldset className="space-y-2">
          <legend className="font-semibold text-ink-900">What should happen?</legend>
          <label className="flex min-h-11 items-start gap-2">
            <input type="radio" name="choice" defaultChecked className="mt-1" />
            <span>
              <span className="font-semibold">Stop new bookings only.</span> The property leaves
              search and takes no new bookings. Everything below stays as it is.
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-2 text-ink-500">
            <input type="radio" name="choice" disabled className="mt-1" />
            <span>
              Also cancel upcoming stays. Not available yet: guests would get a full refund, and
              that cancellation is still being built.
            </span>
          </label>
        </fieldset>
        {preview ? (
          <div className="space-y-2">
            <p className="text-tiny text-ink-600">
              These lists show your bookings as of now. Once paused, no new booking can start.
            </p>
            <Group
              title="Confirmed stays"
              note="These stay booked. Guests can still check in."
              items={preview.confirmedStays.items}
              total={preview.confirmedStays.total}
              render={(s) => `${s.reference} · ${when(s.startsAt)}`}
            />
            <Group
              title="Requests waiting for your answer"
              note="You can still decline them. To accept, resume bookings first."
              items={preview.pendingRequests}
              render={(h) => `${h.reference} · reply by ${when(h.holdExpiresAt)}`}
            />
            <Group
              title="Holds waiting for guest payment"
              note="Guests cannot pay while bookings are paused. Each hold ends at its deadline unless you resume first. No money is taken."
              items={preview.awaitingPayment}
              render={(h) => `${h.reference} · hold ends ${when(h.holdExpiresAt)}`}
            />
          </div>
        ) : !error ? (
          <p role="status">Checking your bookings…</p>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="font-semibold text-ink-900">How long?</legend>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === 'manual'}
              onChange={() => setMode('manual')}
            />
            Until I resume
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === 'date'}
              onChange={() => setMode('date')}
            />
            Until a date
          </label>
          {mode === 'date' ? (
            <label className="block">
              <span className="text-tiny text-ink-600">Bookings open again on</span>
              <input
                type="date"
                name="until"
                required
                min={addLocalDays(today, 1)}
                max={addLocalDays(today, 365)}
                className="mt-1 block min-h-11 w-full rounded-md border border-input px-3"
              />
            </label>
          ) : null}
        </fieldset>
        {error ? (
          <p role="alert" className="text-danger">
            {error}
            {!preview ? (
              <button type="button" onClick={openPreview} className="ml-2 min-h-11 underline">
                Try again
              </button>
            ) : null}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
