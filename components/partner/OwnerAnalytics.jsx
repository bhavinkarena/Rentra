'use client';

import { useRef, useState } from 'react';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import RetryButton from '@/components/portal/RetryButton';
import {
  analyticsDate as label,
  analyticsMoney as money,
  analyticsAxisMoney,
} from '@/lib/domain/owner-analytics-format';

const RANGES = [
  ['7', '7D', 'Last 7 days'],
  ['30', '30D', 'Last 30 days'],
  ['90', '90D', 'Last 90 days'],
  ['12m', '12M', 'Last 12 months'],
];

const sumRent = (rows) => rows.reduce((sum, row) => sum + BigInt(row.rentMinor || 0), 0n);

/** Round the axis top to 1/2/2.5/5 × 10ⁿ so the ticks read as clean numbers. */
function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => value / power <= m);
  return step * power;
}

const when = (row, monthly) =>
  monthly ? `${label(row.date, true)} ${row.date.slice(0, 4)}` : label(row.date);
const visitCount = (row, monthly) =>
  monthly
    ? `${row.visits} visits`
    : `${row.visits - row.cancelled} visits${row.cancelled ? `, ${row.cancelled} cancelled` : ''}`;

function RentChart({ rows, previous, monthly, caption, active, onActive }) {
  const plot = useRef(null);
  const values = rows.map((row) => Number(row.rentMinor || 0));
  const ghost = previous?.map((row) => Number(row.rentMinor || 0)) ?? null;
  const top = niceMax(Math.max(...values, ...(ghost ?? []), 0));
  const n = rows.length;
  const x = (i) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (value) => 100 - (value / top) * 100;
  const path = (series) =>
    series.map((v, i) => `${i ? 'L' : 'M'}${x(i) * 10},${y(v) * 2}`).join(' ');
  const line = path(values);
  const area = `${line} L${x(n - 1) * 10},200 L${x(0) * 10},200 Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const every = Math.max(1, Math.ceil(n / (monthly ? 12 : 6)));
  const point = active == null ? null : rows[active];

  function pick(clientX) {
    const box = plot.current?.getBoundingClientRect();
    if (!box?.width) return;
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    onActive(Math.round(ratio * (n - 1)));
  }
  function key(event) {
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[event.key];
    if (event.key === 'Escape') return onActive(null);
    if (step === undefined) return;
    event.preventDefault();
    onActive(Math.min(n - 1, Math.max(0, (active ?? n - 1) + step)));
  }

  return (
    <>
      {ghost ? (
        <ul
          aria-label="Legend"
          className="mt-5 flex flex-wrap justify-end gap-x-4 gap-y-1 text-tiny text-ink-600"
        >
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-brand-600" aria-hidden="true" />
            This period
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-ink-300" aria-hidden="true" />
            Previous period
          </li>
        </ul>
      ) : null}
      <div className={`relative pb-7 pl-11 ${ghost ? 'mt-3' : 'mt-6'}`}>
        <div aria-hidden="true" className="absolute inset-y-0 bottom-7 left-0 w-9">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-tiny text-ink-500 tabular"
              style={{ top: `${100 - t * 100}%` }}
            >
              {analyticsAxisMoney(top * t)}
            </span>
          ))}
        </div>
        <div
          ref={plot}
          role="img"
          tabIndex={0}
          aria-label={`${caption}. Use the left and right arrow keys to read each ${monthly ? 'month' : 'day'}.`}
          onPointerMove={(event) => pick(event.clientX)}
          onPointerDown={(event) => pick(event.clientX)}
          onPointerLeave={() => onActive(null)}
          onFocus={() => onActive(active ?? n - 1)}
          onBlur={() => onActive(null)}
          onKeyDown={key}
          className="relative h-52 cursor-crosshair touch-pan-y rounded-sm outline-offset-4 sm:h-60"
        >
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden="true"
              className={`absolute inset-x-0 h-px ${t ? 'bg-ink-100' : 'bg-ink-300'}`}
              style={{ top: `${100 - t * 100}%` }}
            />
          ))}
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <path d={area} fill="var(--color-brand-500)" opacity="0.1" />
            {ghost ? (
              <path
                d={path(ghost)}
                fill="none"
                stroke="var(--color-ink-300)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <path
              d={line}
              fill="none"
              stroke="var(--color-brand-600)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {point ? (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-ink-400"
                style={{ left: `${x(active)}%` }}
              />
              {ghost ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-400 ring-2 ring-white"
                  style={{ left: `${x(active)}%`, top: `${y(ghost[active])}%` }}
                />
              ) : null}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 ring-2 ring-white"
                style={{ left: `${x(active)}%`, top: `${y(values[active])}%` }}
              />
            </>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {point
            ? `${when(point, monthly)}: ${money(values[active])}, ${visitCount(point, monthly)}`
            : ''}
        </p>
        <div aria-hidden="true" className="absolute right-0 bottom-0 left-11 h-5">
          {rows.map((row, i) =>
            (i % every === 0 && n - 1 - i >= every / 2) || i === n - 1 ? (
              <span
                key={row.date}
                className={`absolute text-tiny whitespace-nowrap text-ink-500 ${i === 0 ? '' : i === n - 1 ? '-translate-x-full' : '-translate-x-1/2'} ${(i / every) % 2 && i !== n - 1 ? 'max-sm:hidden' : ''}`}
                style={{ left: `${x(i)}%` }}
              >
                {label(row.date, monthly)}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </>
  );
}

export default function OwnerAnalytics({ result, earnings }) {
  const [range, setRange] = useState('30');
  const [active, setActive] = useState(null);
  if (result?.failure || !result?.data)
    return (
      <>
        <h2 id="rent-title" className="text-h4 font-semibold text-ink-900">
          Booked rent
        </h2>
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-meta">
          Analytics could not load. <RetryButton />
        </div>
      </>
    );
  const data = result.data;
  const monthly = range === '12m';
  const days = Number(range);
  const rows = monthly ? data.monthly : data.daily.slice(-days);
  const previous =
    !monthly && days * 2 <= data.daily.length ? data.daily.slice(-days * 2, -days) : null;
  const rent = sumRent(rows);
  const before = previous ? sumRent(previous) : 0n;
  const change = before > 0n ? (Number(rent - before) / Number(before)) * 100 : null;
  const visits = rows.reduce((sum, row) => sum + row.visits - (row.cancelled ?? 0), 0);
  const cancelled = rows.reduce((sum, row) => sum + (row.cancelled ?? 0), 0);
  const [, , rangeName] = RANGES.find(([value]) => value === range);
  const Trend = change >= 0 ? TrendingUp : TrendingDown;
  // The headline follows the crosshair so the number being read is always the big one.
  const point = active == null ? null : rows[active];

  function download() {
    const content = [
      monthly ? 'Month,Visits,Booked rent INR' : 'Date,Visits,Cancelled visits,Booked rent INR',
      ...rows.map((row) =>
        [
          row.date,
          row.visits,
          ...(monthly ? [] : [row.cancelled]),
          (Number(row.rentMinor) / 100).toFixed(2),
        ].join(','),
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rentra-booked-rent-${data.today}-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    [monthly ? 'Visits' : 'Active visits', visits],
    ...(monthly ? [] : [['Cancelled', cancelled]]),
    ['Average per visit', money(visits ? Number(rent) / visits : 0)],
    [
      'This month so far',
      earnings?.failure || !earnings?.data ? '—' : money(earnings.data.bookedRentMinor),
    ],
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="rent-title" className="text-h4 font-semibold text-ink-900">
            Booked rent
          </h2>
          <p className="mt-3 text-h1 leading-none font-semibold tracking-[-0.035em] text-ink-900 tabular">
            {money(point ? point.rentMinor : rent)}
          </p>
          <p className="mt-2 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-600">
            {point ? (
              <>
                <span className="font-semibold text-ink-900">{when(point, monthly)}</span>
                <span>· {visitCount(point, monthly)}</span>
                {previous ? (
                  <span className="text-ink-500">
                    · previous period {money(previous[active].rentMinor)}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                {change != null ? (
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${change >= 0 ? 'text-success' : 'text-danger'}`}
                  >
                    <Trend className="size-4" aria-hidden="true" />
                    {change >= 0 ? '+' : '−'}
                    {Math.abs(change).toFixed(change && Math.abs(change) < 10 ? 1 : 0)}%
                    <span className="sr-only">{change >= 0 ? 'up' : 'down'}</span>
                  </span>
                ) : null}
                <span>
                  {rangeName}
                  {change != null ? ' vs the previous period' : ''} · by visit date
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Date range"
            className="inline-flex h-11 items-center gap-0.5 rounded-md border border-border bg-ink-25 p-1"
          >
            {RANGES.map(([value, short, name]) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                aria-label={name}
                onClick={() => {
                  setRange(value);
                  setActive(null);
                }}
                className={`h-full min-w-11 rounded-[9px] px-2.5 text-meta font-semibold transition-colors ${range === value ? 'bg-card text-ink-900 shadow-sm ring-1 ring-border' : 'text-ink-600 hover:text-ink-900'}`}
              >
                {short}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={download}
            aria-label={`Export ${rangeName.toLowerCase()} as CSV`}
            title="Export CSV"
            className="grid size-11 place-items-center rounded-md border border-border bg-card text-ink-700 hover:bg-ink-50 hover:text-ink-900"
          >
            <Download className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {rent === 0n ? (
        <div className="mt-6 grid h-52 place-items-center rounded-md border border-dashed border-border bg-ink-25 px-6 text-center sm:h-60">
          <p className="max-w-xs text-meta text-ink-600">
            No booked rent in this period yet. Confirmed visits appear here by visit date.
          </p>
        </div>
      ) : (
        <RentChart
          key={range}
          rows={rows}
          previous={previous}
          monthly={monthly}
          active={active}
          onActive={setActive}
          caption={`Booked rent, ${rangeName.toLowerCase()}, total ${money(rent)}`}
        />
      )}
      <dl className="mt-5 grid grid-cols-2 gap-y-4 border-t border-border pt-5 sm:grid-cols-4">
        {stats.map(([name, value]) => (
          <div key={name} className="min-w-0 pr-3">
            <dt className="text-tiny text-ink-500">{name}</dt>
            <dd className="mt-1 text-h4 font-semibold text-ink-900 tabular">{value}</dd>
          </div>
        ))}
      </dl>
      <details className="mt-4 text-meta text-ink-600">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-brand-700">
          View chart data
        </summary>
        <div className="max-h-60 overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-meta">
            <caption className="sr-only">Booked rent, {rangeName.toLowerCase()}</caption>
            <thead className="sticky top-0 bg-ink-50 text-tiny text-ink-600">
              <tr>
                <th className="px-3 py-2 font-semibold">{monthly ? 'Month' : 'Date'}</th>
                <th className="px-3 py-2 font-semibold">Visits</th>
                {monthly ? null : <th className="px-3 py-2 font-semibold">Cancelled</th>}
                <th className="px-3 py-2 text-right font-semibold">Booked rent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular">
              {rows.map((row) => (
                <tr key={row.date}>
                  <td className="px-3 py-1.5">{when(row, monthly)}</td>
                  <td className="px-3 py-1.5">{row.visits}</td>
                  {monthly ? null : <td className="px-3 py-1.5">{row.cancelled}</td>}
                  <td className="px-3 py-1.5 text-right">{money(row.rentMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {earnings?.data && earnings.data.environment !== 'live' ? (
        <p className="mt-2 text-tiny text-ink-500">
          Includes test bookings. This is not money paid to you.
        </p>
      ) : null}
    </>
  );
}
