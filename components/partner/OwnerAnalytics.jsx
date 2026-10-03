'use client';

import { useState } from 'react';
import { Download, ChartNoAxesCombined } from 'lucide-react';
import RetryButton from '@/components/portal/RetryButton';
import {
  analyticsDate as label,
  analyticsMoney as money,
  analyticsAxisMoney,
} from '@/lib/domain/owner-analytics-format';

const colors = [
  'var(--color-brand-500)',
  'var(--color-info)',
  'var(--color-amber-700)',
  'var(--color-event-adjustment)',
  'var(--color-brand-400)',
  'var(--color-danger)',
];

function Panel({ title, subtitle, children, wide = false }) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6 ${wide ? 'xl:col-span-3' : ''}`}
    >
      <h3 className="font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-xs text-ink-500">{subtitle}</p>
      {children}
    </section>
  );
}

function Plot({
  rows,
  field,
  secondary,
  currency = false,
  bars = false,
  monthly = false,
  title,
  color = 'var(--color-brand-500)',
}) {
  const values = rows.map((row) => Number(row[field] || 0));
  const secondaryValues = rows.map((row) => Number(row[secondary] || 0));
  const max = Math.max(1, ...values, ...(secondary ? secondaryValues : []));
  const points = values.map((value, index) => [
    52 + index * (688 / Math.max(1, rows.length - 1)),
    205 - (value / max) * 165,
  ]);
  const path = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ');
  return (
    <>
      <svg
        viewBox="0 0 780 250"
        className="mt-5 w-full"
        role="img"
        aria-label={`${title}. ${rows.length} periods. ${currency ? money(values.reduce((a, b) => a + b, 0)) : values.reduce((a, b) => a + b, 0)} total.`}
      >
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1="52"
              x2="750"
              y1={205 - fraction * 165}
              y2={205 - fraction * 165}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text
              x="45"
              y={209 - fraction * 165}
              textAnchor="end"
              fill="var(--color-ink-500)"
              fontSize="10"
            >
              {currency ? analyticsAxisMoney(max * fraction) : Math.round(max * fraction)}
            </text>
          </g>
        ))}
        {bars ? (
          points.map(([x, y], i) => (
            <rect
              key={rows[i].date}
              x={x - (secondary ? 19 : 9)}
              y={y}
              width="18"
              height={205 - y}
              rx="3"
              fill={color}
            >
              <title>
                {label(rows[i].date, monthly)}: {currency ? money(values[i]) : values[i]}
              </title>
            </rect>
          ))
        ) : (
          <>
            <path d={`${path} L740,205 L52,205 Z`} fill={color} opacity=".09" />
            <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
            {points.map(([x, y], i) => (
              <circle key={rows[i].date} cx={x} cy={y} r="3" fill={color}>
                <title>
                  {label(rows[i].date)}: {currency ? money(values[i]) : values[i]}
                </title>
              </circle>
            ))}
          </>
        )}
        {secondary &&
          points.map(([x], i) => (
            <rect
              key={`secondary-${rows[i].date}`}
              x={x + 2}
              y={205 - (secondaryValues[i] / max) * 165}
              width="18"
              height={(secondaryValues[i] / max) * 165}
              rx="3"
              fill="var(--color-danger)"
            >
              <title>
                {label(rows[i].date, monthly)}: {secondaryValues[i]} cancelled visits
              </title>
            </rect>
          ))}
        {rows.map(
          (row, i) =>
            (monthly ||
              i % Math.max(1, Math.ceil(rows.length / 7)) === 0 ||
              i === rows.length - 1) && (
              <text
                key={row.date}
                x={points[i][0]}
                y="232"
                textAnchor="middle"
                fill="var(--color-ink-500)"
                fontSize="10"
              >
                {label(row.date, monthly)}
              </text>
            ),
        )}
      </svg>
      <div className="flex justify-center gap-5 text-xs text-ink-600">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: color }} />
          {currency ? 'Booked rent' : secondary ? 'Active visits' : 'Visits'}
        </span>
        {secondary && (
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-danger" />
            Cancelled visits
          </span>
        )}
      </div>
      {!values.some(Boolean) && !secondaryValues.some(Boolean) && (
        <p className="text-center text-sm text-ink-500">No activity in this period yet.</p>
      )}
      <details className="mt-3 text-xs text-ink-600">
        <summary className="min-h-11 cursor-pointer content-center">View chart data</summary>
        <div className="max-h-52 overflow-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th className="py-2">Period</th>
                <th>{currency ? 'Rent (INR)' : secondary ? 'Active visits' : 'Visits'}</th>
                {secondary && <th>Cancelled visits</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.date}>
                  <td className="py-1">{row.date}</td>
                  <td>{currency ? money(values[i]) : values[i]}</td>
                  {secondary && <td>{secondaryValues[i]}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function Distribution({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <div className="flex min-h-60 flex-wrap items-center justify-center gap-6">
      <svg
        viewBox="0 0 140 140"
        className="size-36 shrink-0"
        role="img"
        aria-label={`Distribution, ${total} total. See adjacent legend for values.`}
      >
        <circle cx="70" cy="70" r="48" fill="none" stroke="var(--color-ink-100)" strokeWidth="18" />
        {rows.map((row, i) => {
          const size = total ? (row.value / total) * 100 : 0;
          const start = total
            ? (rows.slice(0, i).reduce((sum, item) => sum + item.value, 0) / total) * 100
            : 0;
          return (
            <circle
              key={row.label}
              cx="70"
              cy="70"
              r="48"
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="18"
              pathLength="100"
              strokeDasharray={`${size} ${100 - size}`}
              strokeDashoffset={-start}
              transform="rotate(-90 70 70)"
            />
          );
        })}
        <text
          x="70"
          y="75"
          textAnchor="middle"
          fill="var(--color-ink-900)"
          fontSize="22"
          fontWeight="600"
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-3 text-sm">
        {rows.map((row, i) => (
          <li key={row.label} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="capitalize text-ink-600">{row.label.replaceAll('_', ' ')}</span>
            <strong>{row.value}</strong>
            <span className="text-ink-500">
              {total ? Math.round((row.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
      {!total && <p className="text-sm text-ink-500">No data available yet.</p>}
    </div>
  );
}

export default function OwnerAnalytics({ result, portfolio, earnings }) {
  const [range, setRange] = useState(7);
  if (result?.failure || !result?.data)
    return (
      <div role="alert" className="rounded-xl border p-5">
        Analytics could not load. <RetryButton />
      </div>
    );
  const data = result.data;
  const rows = data.daily.slice(-range);
  const visits = rows.reduce((sum, row) => sum + row.visits, 0);
  const cancellations = rows.reduce((sum, row) => sum + row.cancelled, 0);
  const rent = rows.reduce((sum, row) => sum + BigInt(row.rentMinor), 0n);
  const propertyCount = data.categories.reduce((sum, row) => sum + row.value, 0);
  const activeVisits = visits - cancellations;
  const weekly = [];
  for (let index = 0; index < rows.length; index += 7) {
    const days = rows.slice(index, index + 7);
    weekly.push({
      date: days[0].date,
      visits: days.reduce((sum, day) => sum + day.visits - day.cancelled, 0),
      cancelled: days.reduce((sum, day) => sum + day.cancelled, 0),
    });
  }
  function download() {
    const content = [
      'Date,Visits,Cancelled visits,Booked rent INR',
      ...rows.map(
        (row) =>
          `${row.date},${row.visits},${row.cancelled},${(Number(row.rentMinor) / 100).toFixed(2)}`,
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rentra-analytics-${data.today}-${range}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section aria-label="Portfolio analytics" className="space-y-5 text-ink-900">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-h3 font-semibold">
            <ChartNoAxesCombined className="size-5 text-brand-600" />
            Portfolio performance
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            All properties · visit dates in IST · through {label(data.today)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex gap-1 rounded-lg border border-border bg-card p-1"
            aria-label="Analytics date range"
          >
            {[1, 7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={range === days}
                onClick={() => setRange(days)}
                className={`min-h-11 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${range === days ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-brand-50'}`}
              >
                {days === 1 ? 'Today' : `${days}d`}
              </button>
            ))}
          </div>
          <RetryButton label="Refresh" />
          <button
            type="button"
            onClick={download}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            <Download className="size-4" />
            Export CSV
          </button>
        </div>
      </header>
      <div className="grid overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-3 xl:grid-cols-6">
        {[
          ['Booked rent', money(rent), 'Excludes cancelled visits, fees and deposits'],
          ['Active visits', activeVisits, 'Non-cancelled visits in this period'],
          ['Cancelled visits', cancellations, 'Within the selected period'],
          [
            'Properties',
            portfolio?.failure ? '—' : (portfolio?.data?.total ?? propertyCount),
            'Across your entire portfolio',
          ],
          [
            'Average booked rent',
            money(activeVisits ? Number(rent) / activeVisits : 0),
            'Per non-cancelled visit',
          ],
          [
            'Rent this month',
            earnings?.failure || !earnings?.data ? '—' : money(earnings.data.bookedRentMinor),
            'Month to date · before settlement',
          ],
        ].map(([title, value, hint]) => (
          <div key={title} className="border-b border-border p-5 sm:border-r xl:border-b-0">
            <p className="text-xs text-ink-500">{title}</p>
            <p className="my-2 text-2xl font-semibold tracking-tight text-ink-900 tabular">
              {value}
            </p>
            <p className="text-xs text-ink-500">{hint}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel
            title="Booked rent trend"
            subtitle={`Last ${range} ${range === 1 ? 'day' : 'days'} · INR`}
          >
            <Plot rows={rows} field="rentMinor" currency title="Booked rent trend" />
          </Panel>
        </div>
        <Panel title="Booking status" subtitle="Visits in the last 90 days">
          <Distribution rows={data.statuses} />
        </Panel>
        <div className="xl:col-span-2">
          <Panel
            title="Active visits vs cancellations"
            subtitle={`Last ${range} ${range === 1 ? 'day' : 'days'} · grouped by ${range > 7 ? 'week' : 'day'}`}
          >
            <Plot
              rows={
                range > 7
                  ? weekly
                  : rows.map((row) => ({ ...row, visits: row.visits - row.cancelled }))
              }
              field="visits"
              secondary="cancelled"
              bars
              color="var(--color-info)"
              title="Active visits vs cancellations"
            />
          </Panel>
        </div>
        <Panel title="Property categories" subtitle="Your entire portfolio">
          <Distribution rows={data.categories} />
        </Panel>
        <Panel
          title="Monthly booked rent"
          subtitle="Last 12 months · by visit date · current month to date"
          wide
        >
          <Plot
            rows={data.monthly}
            field="rentMinor"
            currency
            bars
            monthly
            title="Monthly booked rent"
          />
        </Panel>
      </div>
      <p className="text-xs leading-relaxed text-ink-500">
        Booked rent is quoted rent for non-cancelled visits, including test and simulated bookings.
        It is not collected revenue or a payout. See Earnings for payment and settlement details.
      </p>
    </section>
  );
}
