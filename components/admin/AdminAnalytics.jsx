'use client';

import { useState } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { Field, Select } from '@/components/ui/field';
import { AdminTable } from './AdminPrimitives';
import { displayMoney } from '@/lib/domain/display-money';
import { humaniseStatus } from '@/lib/domain/status';

const linkClass =
  'inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 hover:underline';

export default function AdminAnalytics({ modules }) {
  const bookings = modules.bookings?.availability === 'available' ? modules.bookings : null;
  const applications =
    modules.applications?.availability === 'available' ? modules.applications : null;
  const measures = [
    ...(bookings
      ? [
          {
            key: 'bookings',
            title: 'Bookings created',
            rows: bookings.dailySeries,
            field: 'bookings',
            href: bookings.href,
            description:
              'Orders created in the selected IST period, all states. Each order counts once.',
          },
          {
            key: 'rent',
            title: 'Booked rent',
            rows: bookings.dailySeries,
            field: 'rentMinor',
            money: true,
            href: bookings.metrics.find((m) => m.key === 'rent')?.href ?? bookings.href,
            description:
              'Created-order cohort; active visit rent only. Excludes cancelled rent, unpaid holds, fees and deposits.',
          },
        ]
      : []),
    ...(applications
      ? [
          {
            key: 'decisions',
            title: 'Review throughput',
            rows: applications.throughput,
            field: 'decisions',
            href: applications.historyHref,
            description:
              'Recorded approval, rejection and more-information decisions by IST day. This measures decisions, not historical queue size.',
          },
        ]
      : []),
  ];
  const [selected, setSelected] = useState(measures[0]?.key);
  const measure = measures.find((m) => m.key === selected) ?? measures[0];
  if (!measure) return null;
  const values = measure.rows.map((row) => Number(row[measure.field]));
  const max = Math.max(0, ...values);
  const maxIndex = values.indexOf(max);
  const format = (v) => (measure.money ? displayMoney(v) : BigInt(v).toLocaleString('en-IN'));
  const distributionMax = Math.max(1, ...(bookings?.distributions ?? []).map((r) => r.count));
  return (
    <section className="mt-10" aria-label="Period analytics">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-h3 font-semibold tracking-tight text-ink-900">Daily activity</h2>
          <p className="mt-1 text-meta text-ink-600">
            Choose one measure to see its daily pattern.
          </p>
        </div>
        <Field id="dashboard-chart-measure" label="Chart measure">
          <Select
            id="dashboard-chart-measure"
            value={measure.key}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-1 block w-auto min-w-48"
          >
            {measures.map((m) => (
              <option key={m.key} value={m.key}>
                {m.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-h4 font-semibold text-ink-900">{measure.title}</h3>
            <p className="mt-2 max-w-[65ch] text-meta leading-6 text-ink-600">
              {measure.description}
            </p>
          </div>
          <Link href={measure.href} className={linkClass}>
            Matching records
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-6 text-meta text-ink-600">
          Daily scale: 0 to {max > 0 ? format(measure.rows[maxIndex][measure.field]) : format('0')}
          {measure.money ? ' INR' : ''}
        </p>
        {max > 0 ? (
          <svg
            viewBox="0 0 1000 240"
            preserveAspectRatio="none"
            className="mt-4 h-52 w-full sm:h-64"
            aria-hidden="true"
          >
            {[30, 130, 230].map((y) => (
              <path
                key={y}
                d={`M0 ${y}H1000`}
                stroke="var(--color-border)"
                strokeDasharray={y === 230 ? undefined : '4 6'}
              />
            ))}
            {values.map((v, i) => (
              <rect
                key={measure.rows[i].date}
                x={(i * 1000) / values.length + 2}
                y={230 - (v / max) * 200}
                width={Math.max(1, 1000 / values.length - 4)}
                height={(v / max) * 200}
                rx="2"
                fill="var(--color-brand-600)"
              />
            ))}
          </svg>
        ) : (
          <div className="mt-4 flex min-h-52 items-center justify-center border-b border-border px-4 text-center text-meta text-ink-600">
            No {measure.title.toLowerCase()} recorded in this period.
          </div>
        )}
        <p className="mt-2 flex justify-between gap-3 text-meta text-ink-600">
          <span>{measure.rows[0]?.date}</span>
          <span>{measure.rows.at(-1)?.date} (IST)</span>
        </p>
        <details className="group mt-6 border-t border-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-meta font-semibold text-brand-700">
            View exact daily values
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <AdminTable
            label={`${measure.title} data`}
            columns={['IST date', measure.money ? 'Rent (INR)' : 'Count']}
            minWidth={0}
            framed={false}
            empty={!measure.rows.length ? 'No daily data available.' : null}
          >
            {measure.rows.map((row) => (
              <tr key={row.date}>
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3 tabular">{format(row[measure.field])}</td>
              </tr>
            ))}
          </AdminTable>
        </details>
      </div>
      {bookings ? (
        <section className="mt-10">
          <h2 className="text-h3 font-semibold text-ink-900">Booking states</h2>
          <p className="mt-1 mb-4 text-meta text-ink-600">
            Current states of orders created in the selected period.
          </p>
          <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
            {bookings.distributions.length ? (
              <ul className="space-y-5">
                {bookings.distributions.map((row) => (
                  <li key={row.state}>
                    <div className="mb-2 flex justify-between gap-4 text-meta">
                      <span className="text-ink-700">{humaniseStatus(row.state)}</span>
                      <span className="font-semibold text-ink-900 tabular">{row.count}</span>
                    </div>
                    <div
                      className="h-2 max-w-full rounded-sm bg-brand-600"
                      aria-hidden="true"
                      style={{ width: `${(row.count / distributionMax) * 100}%` }}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-ink-600">No orders in this period.</p>
            )}
            <Link href={bookings.href} className={`${linkClass} mt-4`}>
              Matching bookings
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}
    </section>
  );
}
