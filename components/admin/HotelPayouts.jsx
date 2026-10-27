'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  BedDouble,
  CheckCircle2,
  CalendarClock,
  FlaskConical,
  Landmark,
  Percent,
  ReceiptText,
  Send,
  Undo2,
  Wallet,
} from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
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

/** Hotel accounting previews and explicitly unfunded Test statements. */
const money = formatINRMinor;
const button = buttonVariants({ size: 'default' });
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
          {line.netMinor == null ? (
            // Held before pricing (no commission rule yet): there are no amounts to show.
            <td colSpan={6} className="px-4 py-3 text-meta text-ink-600">
              Not priced yet
            </td>
          ) : (
            <>
              <td className={cell}>{money(line.roomMinor)}</td>
              <td className={cell}>{money(line.gstToHotelMinor)}</td>
              <td className={cell}>
                {money(line.commissionMinor + line.commissionGstMinor)}
                <span className="block text-tiny text-ink-600">{line.rateBps / 100}%</span>
              </td>
              <td className={cell}>{money(line.tcsMinor)}</td>
              <td className={cell}>{money(line.tdsMinor)}</td>
              <td className={`${cell} font-semibold`}>{money(line.netMinor)}</td>
            </>
          )}
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
              Confirm Test statement
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
          disabled={!totals.stays || environment === 'live' || pending}
          onClick={() => {
            setResult(null);
            setConfirming(true);
          }}
          className={button}
        >
          <Send aria-hidden="true" />
          Create unfunded Test statement
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
            Test statement {result.runNumber} created. No money moved.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function CloseTestStatement({ runId }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className={buttonVariants({ variant: 'outline' })}
        onClick={() =>
          startTransition(async () => {
            try {
              const outcome = await settleHotelPayoutRun(runId);
              setResult(outcome);
              if (outcome.ok) router.refresh();
            } catch {
              setResult({
                error:
                  'Closure outcome unavailable. Reload to check the statement before retrying.',
              });
            }
          })
        }
      >
        Close Test statement
      </button>
      <p className="text-tiny text-ink-600">Closes the unfunded statement. No money moves.</p>
      {result?.error && <p role="alert">{result.error}</p>}
      {result?.ok && <p role="status">Test statement closed. No bank transfer recorded.</p>}
    </div>
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
        description="Confirmed bookings with verified capture can be accounting eligible before arrival. Provider execution and funding readiness are unavailable. Test statements move no money."
        action={<EnvironmentSwitch environment={environment} />}
      />

      <p className="flex items-center gap-2 text-meta text-ink-600">
        <CalendarClock className="size-4" aria-hidden="true" />
        Accounting statement date {dateLabel(preview.payoutDate)} · as of{' '}
        {dateLabel(preview.periodEnd)}
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
            <p className="text-meta text-ink-600">
              Effective mode:{' '}
              {preview.lines.find((line) => line.ownerId === owner.ownerId)?.payoutMode?.mode ??
                'Unavailable'}{' '}
              (
              {preview.lines.find((line) => line.ownerId === owner.ownerId)?.payoutMode?.source ??
                'unavailable'}
              ). Configuration sends no money.
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
                  {run.environment === 'test'
                    ? run.status === 'completed'
                      ? 'Closed Test statement'
                      : 'Open Test statement'
                    : run.status === 'completed'
                      ? 'Recorded complete'
                      : 'Recorded pending'}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 text-meta">
                {run.environment === 'test' && run.status !== 'completed' ? (
                  <CloseTestStatement runId={run.id} />
                ) : run.utr ? (
                  <>
                    <span className="tabular">{run.utr}</span>
                    {run.executedBy ? (
                      <span className="block text-tiny text-ink-600">by {run.executedBy}</span>
                    ) : null}
                  </>
                ) : run.status === 'scheduled' ? (
                  <span>Bank execution unavailable</span>
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
