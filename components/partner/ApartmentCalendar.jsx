'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { ChevronLeft, ChevronRight, Lock, LockOpen, X } from 'lucide-react';
import { changeApartmentCalendar } from '@/lib/actions/hotel-ops';
import { addLocalDays, formatLocalDate } from '@/lib/domain/booking-dates';

const LABELS = { open: 'Open', booked: 'Booked', buffer: 'Cleaning buffer', blocked: 'Blocked' };
const TONES = {
  open: 'bg-card text-ink-900 hover:border-brand-600',
  booked: 'bg-brand-100 text-brand-900',
  buffer: 'bg-ink-100 text-ink-700',
  blocked: 'bg-warning-bg text-ink-900',
};
const button =
  'inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-meta font-semibold disabled:opacity-40';

/**
 * Story 3.11: a whole apartment's nights. Choose a first and last night (click or keyboard), review
 * the preview, then block or unblock. The calendar version guards against changes made meanwhile;
 * booked and buffer nights cannot be blocked.
 */
export default function ApartmentCalendar({ propertyId, data, baseHref }) {
  const [calendar, setCalendar] = useState(data);
  const [range, setRange] = useState([]);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, start] = useTransition();
  const [from, to] = range.length === 2 ? range : [range[0], range[0]];
  const chosen = from ? calendar.nights.filter((n) => n.date >= from && n.date <= to) : [];
  const canBlock = chosen.length > 0 && chosen.every((n) => n.state === 'open');
  const canUnblock = chosen.some((n) => n.state === 'blocked');

  useEffect(() => {
    // Escape clears the selection, except while typing (e.g. the reason field).
    const onKey = (event) => {
      if (event.key !== 'Escape' || event.target.closest?.('input, textarea, select')) return;
      setRange([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!range.length) return undefined;
    const guard = (event) => event.preventDefault();
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [range.length]);

  const pick = (date) =>
    setRange((current) =>
      current.length !== 1 || date < current[0] ? [date] : [current[0], date],
    );
  const apply = (action) =>
    start(async () => {
      setMessage('');
      const result = await changeApartmentCalendar(propertyId, {
        action,
        from,
        to,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        version: calendar.version,
        calendarFrom: calendar.from,
        calendarDays: calendar.days,
      });
      if (result.error) setMessage(result.error);
      else {
        setCalendar({ ...calendar, ...result.calendar });
        setRange([]);
        setMessage(action === 'block' ? 'Nights blocked.' : 'Nights opened.');
      }
    });

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-h4">Apartment nights</h3>
        <span className="flex gap-2">
          <Link
            aria-label="Earlier nights"
            className={button}
            href={`${baseHref}&from=${addLocalDays(calendar.from, -calendar.days)}`}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Link>
          <Link
            aria-label="Later nights"
            className={button}
            href={`${baseHref}&from=${addLocalDays(calendar.from, calendar.days)}`}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </span>
      </div>
      <ul className="flex flex-wrap gap-3 text-tiny text-ink-700" aria-label="Legend">
        {Object.entries(LABELS).map(([state, label]) => (
          <li key={state} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-sm border border-border ${TONES[state]}`} />
            {label}
          </li>
        ))}
      </ul>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Nights">
        {calendar.nights.map((night) => {
          const selected = from && night.date >= from && night.date <= to;
          return (
            <li key={night.date}>
              <button
                type="button"
                onClick={() => pick(night.date)}
                aria-pressed={Boolean(selected)}
                aria-label={`${formatLocalDate(night.date, { weekday: 'long' })}: ${LABELS[night.state]}${night.reference ? `, ${night.reference}` : ''}`}
                className={`flex min-h-14 w-full flex-col items-start rounded-md border p-1.5 text-left text-tiny ${TONES[night.state]} ${selected ? 'ring-2 ring-brand-600' : 'border-border'}`}
              >
                <span className="font-semibold tabular">{Number(night.date.slice(8))}</span>
                <span className="truncate">{LABELS[night.state]}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {from ? (
        <div className="space-y-3 rounded-md bg-ink-25 p-3" aria-live="polite">
          <p className="text-meta">
            <strong>
              {chosen.length} night{chosen.length === 1 ? '' : 's'}
            </strong>
            : {formatLocalDate(from, { weekday: 'short' })}
            {to !== from ? ` – ${formatLocalDate(to, { weekday: 'short' })}` : ''}
            {range.length === 1 ? ' · choose the last night, or apply to this one' : ''}
          </p>
          {!canBlock && !canUnblock ? (
            <p className="text-meta text-ink-600">
              Booked and cleaning-buffer nights cannot be blocked.
            </p>
          ) : null}
          {canBlock ? (
            <label className="block text-tiny font-semibold text-ink-700">
              Reason (optional, only you see it)
              <input
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 block min-h-11 w-full rounded-md border border-input bg-card px-3 text-base md:text-sm"
              />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              disabled={!canBlock || busy}
              onClick={() => apply('block')}
            >
              <Lock className="size-4" aria-hidden="true" />
              Block
            </button>
            <button
              type="button"
              className={button}
              disabled={!canUnblock || busy}
              onClick={() => apply('unblock')}
            >
              <LockOpen className="size-4" aria-hidden="true" />
              Unblock
            </button>
            <button type="button" className={button} onClick={() => setRange([])}>
              <X className="size-4" aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="text-meta text-ink-800">
          {message}
        </p>
      ) : null}
    </div>
  );
}
