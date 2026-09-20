'use client';
export default function BookingError({ reset }) {
  return <section className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-h2">Booking records are temporarily unavailable</h1><p>Your booking has not been changed. Try loading the record again.</p><button onClick={reset} className="min-h-11 rounded-md bg-brand-700 px-4 text-white">Try again</button></section>;
}
