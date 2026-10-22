'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  BedDouble,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  Landmark,
  Percent,
  ReceiptText,
  Send,
  Undo2,
  Wallet,
} from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { executeHotelPayoutRun, settleHotelPayoutRun } from '@/lib/actions/hotel-finance';
import {
  AdminKpiCard,
  AdminPage,
  AdminPageHeader,
  AdminTable,
  StatusBadge,
} from './AdminPrimitives';

/**
 * Weekly hotel payout run (hotel plan, Phase 8). The preview is the statement;
 * "Make payout run" executes exactly that preview (by hash), then finance
 * records the bank UTR once the transfer is made.
 */
const money = formatINRMinor;
const button = buttonVariants({ size: 'default' });
const outline = buttonVariants({ variant: 'outline', size: 'sm' });
const dateLabel = (value) =>
  value
    ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';
const RUN_ERRORS = {
  STALE_PREVIEW:
    'Bookings changed since this preview. The page has been refreshed; check it again.',
  NO_PAYABLE_STAYS: 'There are no payable stays in this run.',
};
const cell = 'px-4 py-3 tabular whitespace-nowrap';

function EnvironmentSwitch({ environment }) {
  return (
    <nav
      aria-label="Payout environment"
      className="inline-flex rounded-md border border-border p-1"
    >
      {[
        ['live', 'Live', Landmark],
        ['test', 'Test', FlaskConical],
      ].map(([value, label, Icon]) => (
        <Link
          key={value}
          href={`/admin/finance/hotel-payouts?environment=${value}`}
          aria-current={environment === value ? 'page' : undefined}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-meta font-semibold ${
            environment === value ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-50'
          }`}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function LinesTable({ label, lines, held = false }) {
  return (
    <AdminTable
      label={label}
      minWidth={held ? 980 : 900}
      columns={[
        'Booking',
        'Stay',
        'Kept room',
        'GST to hotel',
        'Commission + GST',
        'TCS',
        'TDS',
        'Net',
        ...(held ? ['Held because'] : []),
      ]}
    >
      {lines.map((line) => (
        <tr key={line.bookingId} className="align-top">
          <th scope="row" className="px-4 py-3 text-left font-semibold">
            {line.reference}
            <span className="block text-tiny font-normal text-ink-600">{line.hotel}</span>
          </th>
          <td className="px-4 py-3 whitespace-nowrap">
            {dateLabel(line.checkIn)} – {dateLabel(line.checkOut)}
          </td>
          <td className={cell}>{money(line.roomMinor)}</td>
          <td className={cell}>{money(line.gstToHotelMinor)}</td>
          <td className={cell}>
            {money(line.commissionMinor + line.commissionGstMinor)}
            <span className="block text-tiny text-ink-600">{line.rateBps / 100}%</span>
          </td>
          <td className={cell}>{money(line.tcsMinor)}</td>
          <td className={cell}>{money(line.tdsMinor)}</td>
          <td className={`${cell} font-semibold`}>{money(line.netMinor)}</td>
          {held ? <td className="px-4 py-3 text-meta text-warning">{line.reason}</td> : null}
        </tr>
      ))}
    </AdminTable>
  );
}

function MakeRun({ preview }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();
  const { totals, environment } = preview;
  const run = () =>
    startTransition(async () => {
      const outcome = await executeHotelPayoutRun({
        environment,
        previewHash: preview.previewHash,
      });
      setResult(outcome);
      setConfirming(false);
      if (outcome.ok || outcome.code === 'STALE_PREVIEW') router.refresh();
    });
  return (
    <section aria-label="Payout run" className="rounded-lg border border-border bg-card p-4">
      {confirming ? (
        <div className="space-y-3">
          <p className="text-meta">
            {environment === 'test' ? 'Test statement' : 'Live run'} for{' '}
            <strong>{dateLabel(preview.payoutDate)}</strong>: <strong>{totals.stays}</strong> stays,{' '}
            <strong>{money(totals.netMinor)}</strong> to hotels.
            {environment === 'test' ? ' No money moves.' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={run} className={button}>
              <CheckCircle2 aria-hidden="true" />
              Confirm run
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className={buttonVariants({ variant: 'outline' })}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!totals.stays}
          onClick={() => {
            setResult(null);
            setConfirming(true);
          }}
          className={button}
        >
          <Send aria-hidden="true" />
          Make payout run
        </button>
      )}
      <div aria-live="polite">
        {result?.error ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/30 bg-danger-bg p-3 text-meta text-danger"
          >
            {RUN_ERRORS[result.code] ?? result.error}
          </p>
        ) : null}
        {result?.ok ? (
          <p role="status" className="mt-3 text-meta text-success">
            Run {result.runNumber} created. Record the bank UTR below once the transfer is made.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RecordTransfer({ run }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={outline}>
        <Banknote aria-hidden="true" />
        Record transfer
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const utr = String(new FormData(event.currentTarget).get('utr')).trim();
        startTransition(async () => {
          const outcome = await settleHotelPayoutRun(run.id, utr);
          setResult(outcome);
          if (outcome.ok) router.refresh();
        });
      }}
    >
      <label className="block text-tiny font-semibold">
        Bank UTR for run {run.runNumber}
        <input
          name="utr"
          required
          minLength={6}
          maxLength={32}
          pattern="[A-Za-z0-9]{6,32}"
          title="6 to 32 letters or digits"
          autoComplete="off"
          className={`${fieldClass} mt-1 w-48`}
        />
      </label>
      <button disabled={pending} className={outline}>
        Save
      </button>
      <span aria-live="polite" className="basis-full text-tiny">
        {result?.error ? (
          <span role="alert" className="text-danger">
            {result.error}
          </span>
        ) : null}
      </span>
    </form>
  );
}

export function HotelPayouts({ preview, runs }) {
  const { totals, environment } = preview;
  const tiles = [
    ['Stays', totals.stays, BedDouble],
    ['Paid by guests', money(totals.paidMinor), Wallet],
    ['Refunds', money(totals.refundedMinor), Undo2],
    [
      'Commission + GST',
      money(totals.commissionMinor + totals.commissionGstMinor),
      Percent,
      `${money(totals.commissionMinor)} + ${money(totals.commissionGstMinor)} GST`,
    ],
    ['TCS', money(totals.tcsMinor), ReceiptText],
    ['TDS', money(totals.tdsMinor), ReceiptText],
    ...(totals.gstRentraOwesMinor > 0
      ? [['GST Rentra owes', money(totals.gstRentraOwesMinor), Landmark, 'Section 9(5)']]
      : []),
    ['Net to hotels', money(totals.netMinor), Banknote],
  ];
  return (
    <AdminPage className="space-y-6">
      <AdminPageHeader
        title="Hotel payouts"
        description="Weekly run every Tuesday. A stay is payable after check-in (or 24 h after check-in time). A Test run is a statement only and moves no money."
        action={<EnvironmentSwitch environment={environment} />}
      />

      <p className="flex items-center gap-2 text-meta text-ink-600">
        <CalendarClock className="size-4" aria-hidden="true" />
        Payout date {dateLabel(preview.payoutDate)} · stays up to {dateLabel(preview.periodEnd)}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value, icon, hint]) => (
          <AdminKpiCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            hint={hint}
            tone={label === 'Net to hotels' ? 'brand' : 'neutral'}
          />
        ))}
      </div>

      <p className="rounded-md bg-ink-25 p-3 text-meta tabular text-ink-700">
        Paid {money(totals.paidMinor)} − refunds {money(totals.refundedMinor)} − GST Rentra owes{' '}
        {money(totals.gstRentraOwesMinor)} − commission {money(totals.commissionMinor)} − GST on
        commission {money(totals.commissionGstMinor)} − TCS {money(totals.tcsMinor)} − TDS{' '}
        {money(totals.tdsMinor)} = <strong>net {money(totals.netMinor)}</strong>
      </p>

      <MakeRun preview={preview} />

      {preview.owners.length ? (
        preview.owners.map((owner) => (
          <section key={owner.ownerId} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-h4">{owner.hotels.join(', ')}</h2>
              <p className="text-meta tabular">
                {owner.stays} stays · net <strong>{money(owner.netMinor)}</strong>
              </p>
            </div>
            <p className="flex items-center gap-2 text-tiny text-ink-600">
              <Landmark className="size-4" aria-hidden="true" />
              {owner.destination ?? 'No payout destination on file'}
            </p>
            <LinesTable
              label={`Stays for ${owner.hotels.join(', ')}`}
              lines={preview.lines.filter((line) => line.ownerId === owner.ownerId)}
            />
          </section>
        ))
      ) : (
        <p className="text-meta text-ink-600">No payable stays this week.</p>
      )}

      {preview.held.length ? (
        <section className="space-y-3">
          <h2 className="text-h4">Held ({preview.held.length})</h2>
          <LinesTable label="Held stays" lines={preview.held} held />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-h4">Past runs</h2>
        <AdminTable
          label="Past payout runs"
          minWidth={900}
          columns={['Run', 'Environment', 'Period', 'Payout date', 'Stays', 'Net', 'Status', 'UTR']}
          empty={runs.items.length ? null : 'No payout runs yet.'}
        >
          {runs.items.map((run) => (
            <tr key={run.id} className="align-top">
              <th scope="row" className="px-4 py-3 text-left font-semibold tabular">
                {run.runNumber}
              </th>
              <td className="px-4 py-3">
                <StatusBadge tone={run.environment === 'live' ? 'info' : 'neutral'}>
                  {run.environment === 'live' ? 'Live' : 'Test'}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {dateLabel(run.periodStart)} – {dateLabel(run.periodEnd)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{dateLabel(run.payoutDate)}</td>
              <td className={cell}>{run.stays}</td>
              <td className={`${cell} font-semibold`}>{money(run.netMinor)}</td>
              <td className="px-4 py-3">
                <StatusBadge tone={run.status === 'completed' ? 'success' : 'warning'}>
                  {run.status === 'completed' ? 'Paid' : 'Scheduled'}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 text-meta">
                {run.utr ? (
                  <>
                    <span className="tabular">{run.utr}</span>
                    {run.executedBy ? (
                      <span className="block text-tiny text-ink-600">by {run.executedBy}</span>
                    ) : null}
                  </>
                ) : run.status === 'scheduled' ? (
                  <RecordTransfer run={run} />
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </AdminPage>
  );
}
