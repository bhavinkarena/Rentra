'use client';
import toast from 'react-hot-toast';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { toggleListingPause } from '@/lib/actions/partner';
import { addLocalDays, propertyToday } from '@/lib/domain/booking-dates';

const message = (result) =>
  result?.error ||
  Object.values(result?.errors ?? {})
    .flat()
    .join(' ');

/** PROP-05: pause asks first and can end on a date; resume is one press. */
export default function PauseButton({ listing, upcoming = 0 }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('manual');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const paused = listing.status === 'paused';
  if (!['live', 'paused'].includes(listing.status)) return null;
  const today = propertyToday();
  const send = (until = '') =>
    start(async () => {
      const form = new FormData();
      form.set('id', listing.id);
      if (until) form.set('until', until);
      const result = await toggleListingPause({}, form);
      if (message(result)) setError(message(result));
      else {
        setOpen(false);
        setError('');
        toast.success(paused ? 'Bookings resumed.' : 'Bookings paused.');
        router.refresh();
      }
    });
  const Icon = paused ? Play : Pause;
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => (paused ? send() : setOpen(true))}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-60`}
      >
        <Icon className="size-4" aria-hidden="true" />
        {pending ? 'Saving…' : paused ? 'Resume bookings' : 'Pause bookings'}
      </button>
      {paused && error ? (
        <p role="alert" className="mt-1 text-tiny text-danger">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        title={`Pause bookings for ${listing.title}?`}
        confirmLabel="Pause bookings"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={(data) => send(mode === 'date' ? String(data.get('until') || '') : '')}
      >
        <p>
          Guests can&apos;t book new dates and the property leaves search.{' '}
          {upcoming
            ? `Your ${upcoming} upcoming booking${upcoming === 1 ? '' : 's'} stay.`
            : 'Nothing else changes.'}
        </p>
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
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
