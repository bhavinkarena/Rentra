'use client';
import toast from 'react-hot-toast';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  confirmCancelUpcoming,
  previewCancelUpcoming,
  previewListingPause,
  toggleListingPause,
} from '@/lib/actions/partner';
import { formatINRMinor } from '@/lib/domain/booking-money';
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
 * until it is declined or expires. Story 2.15 adds the second choice: pause
 * and cancel every upcoming stay with a full refund. Resume is one press.
 */
export default function PauseButton({ listing }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('manual');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  // Story 2.15: pause AND cancel every upcoming stay, with a full refund of what each guest paid.
  const [choice, setChoice] = useState('stop');
  const [cancelPlan, setCancelPlan] = useState(null);
  const [results, setResults] = useState(null);
  const requestKey = useRef(null);
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
  const loadCancelPlan = () =>
    start(async () => {
      setCancelPlan(null);
      const result = await previewCancelUpcoming(listing.id);
      if (message(result)) setError(message(result));
      else setCancelPlan(result);
    });
  const cancelUpcoming = (reason) =>
    start(async () => {
      // The same key on a retry after a lost response returns the recorded outcome.
      requestKey.current ??= crypto.randomUUID();
      const result = await confirmCancelUpcoming(listing.id, {
        hash: cancelPlan.hash,
        expectedVersion: cancelPlan.version,
        requestKey: requestKey.current,
        reason,
      });
      if (message(result)) {
        setError(message(result));
        // Only a server failure keeps the key, so the retry finishes the same request.
        if (result.status < 500) requestKey.current = null;
        if (result.code === 'CANCELLATION_CHANGED') loadCancelPlan();
        return;
      }
      requestKey.current = null;
      setResults(result.results);
      setOpen(false);
      setError('');
      toast.success('Bookings paused and upcoming stays cancelled.');
      router.refresh();
    });
  const openPreview = () => {
    setChoice('stop');
    setCancelPlan(null);
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
      {results ? (
        <section
          className="mt-2 rounded-md border border-border bg-card p-3 text-tiny"
          aria-live="polite"
        >
          <h3 className="font-semibold text-ink-900">What happened to each booking</h3>
          <ul className="mt-1 space-y-1">
            {results.map((r) => (
              <li key={r.orderId}>
                {r.reference} ·{' '}
                {r.outcome === 'cancelled'
                  ? `cancelled, refund ${formatINRMinor(r.refundMinor)} recorded`
                  : r.outcome === 'released'
                    ? 'unpaid hold released'
                    : r.outcome === 'changed'
                      ? 'changed before cancelling; check the booking'
                      : 'not cancelled — Rentra will handle it'}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ConfirmDialog
        open={open}
        title={`Pause bookings for ${listing.title}?`}
        confirmLabel={choice === 'cancel' ? 'Pause and cancel stays' : 'Stop new bookings'}
        pending={pending || (choice === 'cancel' ? !cancelPlan : !preview)}
        onCancel={() => setOpen(false)}
        onConfirm={(data) =>
          choice === 'cancel'
            ? cancelUpcoming(String(data.get('reason') || ''))
            : send('pause', mode === 'date' ? String(data.get('until') || '') : '')
        }
      >
        <fieldset className="space-y-2">
          <legend className="font-semibold text-ink-900">What should happen?</legend>
          <label className="flex min-h-11 items-start gap-2">
            <input
              type="radio"
              name="choice"
              checked={choice === 'stop'}
              onChange={() => setChoice('stop')}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Stop new bookings only.</span> The property leaves
              search and takes no new bookings. Everything below stays as it is.
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-2">
            <input
              type="radio"
              name="choice"
              checked={choice === 'cancel'}
              onChange={() => {
                setChoice('cancel');
                // Cancelling pauses until the owner resumes; no end date applies.
                setMode('manual');
                if (!cancelPlan) loadCancelPlan();
              }}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Stop new bookings and cancel upcoming stays.</span>{' '}
              Every stay that has not started is cancelled and each guest gets back everything they
              paid. Stays already under way are not affected.
            </span>
          </label>
        </fieldset>
        {choice === 'cancel' ? (
          cancelPlan ? (
            <div className="space-y-2">
              <Group
                title="Stays to cancel"
                note={`Guests are refunded ${formatINRMinor(cancelPlan.refundTotalMinor)} in total. Refunds are recorded now; the payment provider completes them later.`}
                items={cancelPlan.stays}
                render={(s) =>
                  s.blocked
                    ? `${s.reference} · Rentra will handle this one (${s.blocked === 'PAYMENT_UNVERIFIED' ? 'no verified online payment' : 'needs a manual check'})`
                    : `${s.reference} · ${when(s.startsAt)} · refund ${formatINRMinor(s.refundMinor)}${s.ownerPaidOut ? ' · you were already paid for this stay' : ''}`
                }
              />
              <Group
                title="Unpaid requests and holds"
                note="Released. No money was taken, so nothing is refunded."
                items={cancelPlan.unpaidHolds}
                render={(h) =>
                  h.paymentInFlight
                    ? `${h.reference} · a payment is in progress; Rentra will handle this one`
                    : h.reference
                }
              />
              {cancelPlan.startedExcluded ? (
                <p className="text-tiny text-ink-600">
                  {cancelPlan.startedExcluded} stay
                  {cancelPlan.startedExcluded === 1 ? ' has' : 's have'} already started and{' '}
                  {cancelPlan.startedExcluded === 1 ? 'is' : 'are'} not cancelled.
                </p>
              ) : null}
              <label className="block text-meta font-semibold">
                Reason guests will see
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  onChange={() => (requestKey.current = null)}
                  className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-base md:text-sm"
                />
              </label>
            </div>
          ) : !error ? (
            <p role="status">Checking your upcoming stays…</p>
          ) : null
        ) : null}
        {choice === 'stop' && preview ? (
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
        ) : choice === 'stop' && !error ? (
          <p role="status">Checking your bookings…</p>
        ) : null}
        <fieldset className={choice === 'stop' ? 'space-y-2' : 'hidden'}>
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
