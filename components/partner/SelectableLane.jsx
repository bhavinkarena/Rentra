'use client';

import { useState } from 'react';
import { addLocalDays } from '@/lib/domain/booking-dates';
import { minuteToHhmm } from '@/lib/domain/hourly';

const STEP = 30;

/** Writes a value the way typing would, so the form notices the change. */
function fill(form, name, value) {
  const input = form.elements.namedItem(name);
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * One court's row on the day timeline (entertainment plan, Phase 9). Dragging
 * across empty time (or clicking it, for one hour) pre-fills the "Block an exact
 * period" form below with that court and range. Pointer only: keyboard users fill
 * the same form directly, so nothing becomes unreachable.
 */
export default function SelectableLane({ courtId, date, from, total, className, style, children }) {
  const [drag, setDrag] = useState(null);
  const minuteAt = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 0.999);
    return from + Math.floor((ratio * total) / STEP) * STEP;
  };
  const range = drag && {
    start: Math.min(drag.anchor, drag.at),
    end: Math.max(drag.anchor, drag.at) + STEP,
  };

  function finish() {
    if (!range) return;
    // A plain click blocks one hour from where it landed.
    const end = drag.anchor === drag.at ? range.start + 60 : range.end;
    setDrag(null);
    const form = document.getElementById('block-form');
    if (!form) return;
    const at = (minute) => ({
      day: addLocalDays(date, Math.floor(minute / 1440)),
      time: minuteToHhmm(minute),
    });
    fill(form, 'resourceId', courtId ?? '');
    fill(form, 'from', at(range.start).day);
    fill(form, 'startTime', at(range.start).time);
    fill(form, 'to', at(end).day);
    fill(form, 'endTime', at(end).time);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.namedItem('reason')?.focus({ preventScroll: true });
  }

  return (
    <div
      className={`${className} cursor-crosshair touch-pan-y select-none`}
      style={style}
      onPointerDown={(event) => {
        // Existing bookings and blocks keep their own click (open the booking).
        if (event.button !== 0 || event.target.closest('a,[role="img"]')) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const at = minuteAt(event);
        setDrag({ anchor: at, at });
      }}
      onPointerMove={(event) => drag && setDrag({ ...drag, at: minuteAt(event) })}
      onPointerUp={finish}
      onPointerCancel={() => setDrag(null)}
    >
      {children}
      {range ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 rounded-md border-2 border-dashed border-brand-600 bg-brand-50/70"
          style={{
            left: `${((range.start - from) / total) * 100}%`,
            width: `${((range.end - range.start) / total) * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}
