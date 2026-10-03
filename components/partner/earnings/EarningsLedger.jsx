'use client';

import { Fragment, useState } from 'react';
import { ArrowUpRight, ChevronDown, ReceiptText } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { displayMoney } from '@/lib/domain/display-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { earningState, earningsTime } from '@/lib/domain/owner-earnings';
import styles from './Earnings.module.css';

const slots = { day: 'Day visit', night: 'Overnight', full_day: 'Full day', hourly: 'Court visit' };
const positive = (value) => /^\d+$/.test(String(value)) && BigInt(value) > 0n;

function RecordDetails({ row }) {
  return (
    <div className="grid gap-5 text-meta sm:grid-cols-3">
      <div>
        <p className="text-tiny text-ink-500">Recorded</p>
        <p className="mt-1 text-ink-800">{earningsTime(row.recordedAt)}</p>
        <p className="mt-3 text-tiny text-ink-500">Payout</p>
        <p className="mt-1 text-ink-700">Not switched on yet</p>
      </div>
      <dl className="space-y-2">
        {[
          ['Booked rent', row.bookedRentMinor],
          ['Refunded', row.refundedMinor],
          ...(positive(row.refundPendingMinor)
            ? [['Refund in progress', row.refundPendingMinor]]
            : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-ink-600">{label}</dt>
            <dd className="font-semibold text-ink-900 tabular">{displayMoney(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col items-start">
        {row.bookingLinkAvailable ? (
          <Link
            href={`/partner/bookings?booking=${row.orderId}`}
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-800 hover:underline"
          >
            Open booking
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <p className="text-tiny text-ink-500">Booking details unavailable for this record.</p>
        )}
        {(row.earningLineIds ?? []).map((id, index) => (
          <Link
            key={id}
            href={`/partner/allocations/${id}`}
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-800 hover:underline"
          >
            <ReceiptText className="size-4" aria-hidden="true" />
            {row.earningLineIds.length === 1 ? 'Earning details' : `Earning line ${index + 1}`}
          </Link>
        ))}
      </div>
    </div>
  );
}

function RowStatus({ row }) {
  return (
    <StatusBadge domain="booking" state={row.state}>
      {earningState(row.state)}
    </StatusBadge>
  );
}

export default function EarningsLedger({ items }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <>
      <div
        role="region"
        aria-label="Rent by visit"
        tabIndex={0}
        className="hidden min-w-0 overflow-x-auto lg:block"
      >
        <table className={`${styles.ledgerTable} min-w-[760px] text-meta`}>
          <caption className="sr-only">Recorded rent and refunds for each visit</caption>
          <thead>
            <tr>
              {['Property / guest', 'Visit', 'Status', 'Booked rent', 'Refunded', 'Details'].map(
                (label) => (
                  <th
                    scope="col"
                    key={label}
                    className={['Booked rent', 'Refunded'].includes(label) ? 'text-right' : ''}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <Fragment key={row.id}>
                <tr className={expanded === row.id ? 'bg-brand-50/40' : 'hover:bg-ink-25'}>
                  <td className="max-w-72">
                    <p className="font-semibold text-ink-900">{row.title || 'Untitled property'}</p>
                    <p className="mt-1 text-tiny text-ink-500">
                      {row.guestFirstName || 'Guest'}{' '}
                      <span className="mx-1" aria-hidden="true">
                        ·
                      </span>
                      <span className="break-all">{row.reference}</span>
                    </p>
                  </td>
                  <td className="whitespace-nowrap">
                    <p className="text-ink-800">{formatLocalDate(row.visitDate)}</p>
                    <p className="mt-1 text-tiny text-ink-500">{slots[row.slot] || 'Visit'}</p>
                  </td>
                  <td>
                    <RowStatus row={row} />
                  </td>
                  <td className="text-right font-semibold text-ink-900 tabular">
                    {displayMoney(row.bookedRentMinor)}
                  </td>
                  <td className="text-right text-ink-600 tabular">
                    {displayMoney(row.refundedMinor)}
                    {positive(row.refundPendingMinor) ? (
                      <p className="mt-1 whitespace-nowrap text-tiny text-warning">
                        {displayMoney(row.refundPendingMinor)} pending
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      aria-expanded={expanded === row.id}
                      aria-controls={`earning-${row.id}`}
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                      aria-label={`${expanded === row.id ? 'Hide' : 'Show'} details for ${row.reference}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-tiny font-semibold text-ink-700 hover:bg-ink-100"
                    >
                      Details
                      <ChevronDown
                        className={`size-4 transition-transform ${expanded === row.id ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </td>
                </tr>
                {expanded === row.id ? (
                  <tr id={`earning-${row.id}`}>
                    <td colSpan={6} className="bg-ink-25">
                      <RecordDetails row={row} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className="divide-y divide-border border-t border-border lg:hidden"
        aria-label="Rent by visit"
      >
        {items.map((row) => (
          <li key={row.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-meta font-semibold text-ink-900">
                  {row.title || 'Untitled property'}
                </p>
                <p className="mt-1 text-tiny text-ink-500">
                  {row.guestFirstName || 'Guest'} · {row.reference}
                </p>
              </div>
              <p className="shrink-0 text-meta font-bold text-ink-900 tabular">
                {displayMoney(row.bookedRentMinor)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-tiny text-ink-600">
                {formatLocalDate(row.visitDate)} · {slots[row.slot] || 'Visit'}
              </p>
              <RowStatus row={row} />
            </div>
            {positive(row.refundedMinor) || positive(row.refundPendingMinor) ? (
              <p className="mt-3 text-tiny text-warning">
                Refunded {displayMoney(row.refundedMinor)}
                {positive(row.refundPendingMinor)
                  ? ` · ${displayMoney(row.refundPendingMinor)} in progress`
                  : ''}
              </p>
            ) : null}
            <details className="mt-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-tiny font-semibold text-brand-800">
                Booking and earning details
                <ChevronDown className="size-4" aria-hidden="true" />
              </summary>
              <div className="mt-2 border-t border-border pt-4">
                <RecordDetails row={row} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
