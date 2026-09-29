'use client';
import { useTransition } from 'react';

export default function BookingError({ retry }) {
  const [pending, startTransition] = useTransition();
  return (
    <section className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-h2">Booking records are temporarily unavailable</h1>
      <p>Your booking has not been changed. Try loading the record again.</p>
      <button
        onClick={() => startTransition(() => retry())}
        disabled={pending}
        className="min-h-11 rounded-md bg-primary px-4 text-white disabled:cursor-wait disabled:bg-muted disabled:text-muted-foreground"
      >
        {pending ? 'Retrying…' : 'Try again'}
      </button>
    </section>
  );
}
