'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Users, X } from 'lucide-react';
import { decideBookingRequest } from '@/lib/actions/partner';
import { formatINRMinor as money } from '@/lib/domain/booking-money';
import { clockTime, shortDay } from '@/lib/domain/checkout-display';

const SLOTS = {
  day: 'Day picnic',
  night: 'Overnight',
  full_day: 'Full day',
  hourly: 'Time slot',
  stay: 'Stay',
};

function RequestCard({ request }) {
  const router = useRouter();
  const [state, setState] = useState({});
  const [pending, startTransition] = useTransition();
  const decide = (approve) =>
    startTransition(async () => {
      const result = await decideBookingRequest(request.orderId, approve);
      setState(result.error ? result : { done: approve ? 'Accepted' : 'Declined' });
      router.refresh();
    });
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{request.customerName}</p>
          <p className="text-meta text-ink-600">
            {request.propertyTitle} · {shortDay(request.startsAt)}
            {request.visits > 1 ? ` + ${request.visits - 1} more` : ''} ·{' '}
            {SLOTS[request.slot] ?? 'Booking'}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-meta text-ink-600">
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" aria-hidden="true" /> {request.guests} guests
            </span>
            <span className="font-semibold text-ink-800">{money(Number(request.rentMinor))}</span>
            <span className="inline-flex items-center gap-1 text-warning">
              <Clock className="size-4" aria-hidden="true" /> Reply by {shortDay(request.respondBy)}
              , {clockTime(request.respondBy)}
            </span>
          </p>
        </div>
        {state.done ? (
          <p role="status" className="text-sm font-semibold">
            {state.done}
          </p>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => decide(false)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-4 font-semibold disabled:opacity-50"
            >
              <X className="size-4" aria-hidden="true" /> Decline
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => decide(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 font-semibold text-white disabled:bg-muted"
            >
              <Check className="size-4" aria-hidden="true" /> Accept
            </button>
          </div>
        )}
      </div>
      {state.error ? (
        <p role="alert" className="mt-2 text-meta text-danger">
          {state.error}
        </p>
      ) : null}
    </li>
  );
}

/** Request-to-book properties: open requests waiting for the owner, soonest deadline first. */
export default function BookingRequests({ requests = [] }) {
  if (!requests.length) return null;
  return (
    <section
      id="requests"
      aria-labelledby="requests-title"
      className="mx-auto max-w-6xl space-y-3 px-4 pt-4 sm:px-6"
    >
      <div>
        <h2 id="requests-title" className="text-h3">
          Booking requests · {requests.length}
        </h2>
        <p className="text-meta text-ink-600">
          Guests pay only after you accept. Unanswered requests expire at the reply time.
        </p>
      </div>
      <ul className="space-y-2">
        {requests.map((request) => (
          <RequestCard key={request.orderId} request={request} />
        ))}
      </ul>
    </section>
  );
}
