'use client';

import { useRef, useState } from 'react';
import { displayMoney } from '@/lib/domain/display-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import styles from './Earnings.module.css';

export default function EarningsChart({ activity }) {
  const [selected, setSelected] = useState(null);
  const bars = useRef([]);
  const active = selected == null ? null : activity.days[selected];
  const empty = activity.maxMinor === '0';
  const last = activity.days.length - 1;
  function move(event, index) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : Math.min(last, Math.max(0, index + step));
    if (!step && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    bars.current[target]?.focus();
  }
  return (
    <div className={`${styles.chart} mt-6 border-t border-border pt-5`}>
      <div className="flex min-h-12 flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h3 className="text-meta font-semibold text-ink-800">Rent recorded by day</h3>
        <p aria-live="polite" className="text-tiny text-ink-600">
          {active ? (
            <>
              <span>{formatLocalDate(active.date)}</span>
              <strong className="ml-2 font-semibold text-ink-900 tabular">
                {displayMoney(active.bookedRentMinor)}
              </strong>
              <span className="ml-2">
                {active.visits} {active.visits === 1 ? 'visit' : 'visits'}
              </span>
            </>
          ) : (
            'Select a day to see its recorded rent'
          )}
        </p>
      </div>
      <div className="relative flex gap-3">
        <div
          aria-hidden="true"
          className="flex h-36 shrink-0 flex-col justify-between pb-1 text-tiny text-ink-500 tabular sm:h-40"
        >
          <span>{displayMoney(activity.maxMinor)}</span>
          <span>{displayMoney((BigInt(activity.maxMinor) / 2n).toString())}</span>
          <span>₹0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 flex h-36 flex-col justify-between sm:h-40"
          >
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-border" />
          </div>
          <div
            role="group"
            aria-label="Daily booked rent chart. Use left and right arrows to move between days."
            className="relative grid h-36 gap-1 sm:h-40 sm:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${activity.days.length}, minmax(0, 1fr))` }}
          >
            {activity.days.map((day, index) => (
              <button
                key={day.date}
                type="button"
                tabIndex={index === (selected ?? 0) ? 0 : -1}
                ref={(element) => {
                  bars.current[index] = element;
                }}
                aria-label={`${formatLocalDate(day.date)}: ${displayMoney(day.bookedRentMinor)} booked rent, ${day.visits} visits`}
                aria-pressed={selected === index}
                onMouseEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => move(event, index)}
                className={`${styles.dayBar} group relative flex min-w-0 flex-1 items-end rounded-sm focus-visible:outline-offset-2`}
              >
                <span
                  aria-hidden="true"
                  className={`w-full rounded-t-sm transition-colors ${selected === index ? 'bg-brand-800' : day.height ? 'bg-brand-500 group-hover:bg-brand-700' : 'bg-ink-200'}`}
                  style={{ height: day.height ? `${Math.max(2, day.height)}%` : '2px' }}
                />
              </button>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="mt-2 grid gap-1 text-center text-tiny text-ink-500 tabular sm:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${activity.days.length}, minmax(0, 1fr))` }}
          >
            {activity.days.map((day, index) => (
              <span key={day.date}>{[0, 6, 13, 20, last].includes(index) ? index + 1 : ''}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-tiny text-ink-500">
        {empty
          ? 'No rent was recorded in this month.'
          : 'Booked rent on the date it was first recorded, not the visit date.'}
      </p>
    </div>
  );
}
