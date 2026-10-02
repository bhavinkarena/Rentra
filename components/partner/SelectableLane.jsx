'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { addLocalDays } from '@/lib/domain/booking-dates';
import { minuteToHhmm } from '@/lib/domain/hourly';
import { ActionForm } from './listing/BookingCalendarSettings';
import { blockDates } from '@/lib/actions/partner';

const everyHalfMinute = (tick) => {
  const timer = setInterval(tick, 30000);
  return () => clearInterval(timer);
};
/** Live "now" marker; rendered only in the browser so server and client markup agree. */
export function NowLine({ date, from, total }) {
  const now = useSyncExternalStore(
    everyHalfMinute,
    () => Math.floor(Date.now() / 60000),
    () => null,
  );
  if (now == null) return null;
  const minute = now - Date.parse(`${date}T00:00:00+05:30`) / 60000;
  if (minute < from || minute > from + total) return null;
  return (
    <span
      data-now-line
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-danger"
      style={{ left: `${((minute - from) / total) * 100}%` }}
    />
  );
}

/** Native dialog keeps the same guarded block command for drag, keyboard and mobile. */
export default function SelectableLane({
  courtId,
  date,
  from,
  total,
  className,
  style,
  children,
  property,
  items = [],
}) {
  const dialog = useRef(null),
    [drag, setDrag] = useState(null),
    [selection, setSelection] = useState(null);
  const minuteAt = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    return (
      from +
      Math.floor((Math.min(Math.max((e.clientX - b.left) / b.width, 0), 0.999) * total) / 30) * 30
    );
  };
  const range = drag
    ? { start: Math.min(drag.anchor, drag.at), end: Math.max(drag.anchor, drag.at) + 30 }
    : null;
  const overlaps = (r) =>
    items.some(
      (i) =>
        (!courtId || !i.resource_id || i.resource_id === courtId) &&
        i.blockedStart < r.end &&
        i.blockedEnd > r.start,
    );
  const show = (r) => {
    setSelection(r);
    dialog.current?.showModal();
  };
  const at = (m) => ({ day: addLocalDays(date, Math.floor(m / 1440)), time: minuteToHhmm(m) });
  return (
    <>
      <div
        className={`${className} cursor-crosshair touch-pan-y select-none`}
        style={style}
        onPointerDown={(e) => {
          if (e.button !== 0 || e.target.closest('a,[role="img"],button')) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const at = minuteAt(e);
          setDrag({ anchor: at, at });
        }}
        onPointerMove={(e) => drag && setDrag({ ...drag, at: minuteAt(e) })}
        onPointerUp={() => {
          if (range)
            show({
              ...range,
              end: drag.anchor === drag.at ? Math.min(range.start + 60, from + total) : range.end,
            });
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        {children}
        <NowLine date={date} from={from} total={total} />
        <button
          type="button"
          className="absolute right-1 top-1 z-10 rounded border bg-card px-2 text-tiny min-h-11"
          onClick={() => show({ start: from, end: Math.min(from + 60, from + total) })}
          aria-label={`Block ${courtId ? 'court' : 'whole venue'} time`}
        >
          Block time
        </button>
        {range && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1 rounded border-2 border-dashed ${overlaps(range) ? 'border-danger bg-danger/20' : 'border-brand-600 bg-brand-50/70'}`}
            style={{
              left: `${((range.start - from) / total) * 100}%`,
              width: `${((range.end - range.start) / total) * 100}%`,
            }}
          />
        )}
      </div>
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-auto rounded-lg border bg-card p-4 text-foreground backdrop:bg-black/30"
      >
        <button
          type="button"
          className="min-h-11 underline"
          onClick={() => dialog.current?.close()}
        >
          Cancel
        </button>
        {selection && (
          <ActionForm
            key={`${selection.start}-${selection.end}`}
            action={blockDates}
            rentableId={property.id}
            calendarVersion={property.version}
            title="Block this time"
            button="Block time"
          >
            <input type="hidden" name="resourceId" value={courtId || ''} />
            {overlaps(selection) && (
              <p role="alert" className="text-danger">
                This selection overlaps a booking or block. Choose a free time.
              </p>
            )}
            {['start', 'end'].map((edge, i) => (
              <div key={edge} className="flex gap-2 flex-wrap">
                <label>
                  {i ? 'To date' : 'From date'}
                  <input
                    className="block min-h-11 border rounded p-2"
                    name={i ? 'to' : 'from'}
                    type="date"
                    required
                    defaultValue={at(selection[edge]).day}
                  />
                </label>
                <label>
                  {i ? 'To time (IST)' : 'From time (IST)'}
                  <input
                    className="block min-h-11 border rounded p-2"
                    name={i ? 'endTime' : 'startTime'}
                    type="time"
                    required
                    defaultValue={at(selection[edge]).time}
                  />
                </label>
              </div>
            ))}
            <div className="flex gap-2 md:hidden">
              {[-60, 60].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="min-h-11 border rounded px-3"
                  onClick={() =>
                    setSelection({
                      ...selection,
                      end: Math.max(
                        selection.start + 30,
                        Math.min(from + total, selection.end + n),
                      ),
                    })
                  }
                >
                  {n < 0 ? '−1 hour' : '+1 hour'}
                </button>
              ))}
            </div>
            <label>
              Reason
              <input
                className="block min-h-11 border rounded p-2 w-full"
                name="reason"
                minLength={3}
                maxLength={500}
                required
              />
            </label>
          </ActionForm>
        )}
      </dialog>
    </>
  );
}
