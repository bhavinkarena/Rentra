'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignOwnerRecovery } from '@/lib/actions/hotel-finance';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { control } from './PropertyCommandForm';

// API sends integer paise as strings; amounts here stay within safe integers.
const money = (minor) => formatINRMinor(Number(minor));
const cell = 'px-3 py-2 text-left';

export default function OwnerRecoveries({ data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(null);
  const [result, setResult] = useState(null);
  const assign = (row, reason) =>
    startTransition(async () => {
      let outcome;
      try {
        // A retry after a lost response reuses this dialog's request key, so it replays.
        outcome = await assignOwnerRecovery(row.sourceId, {
          hash: row.hash,
          expectedVersion: row.version,
          requestKey: open.requestKey,
          reason,
        });
      } catch {
        setResult({ error: 'Could not reach Rentra. Try again.' });
        return;
      }
      setResult(outcome);
      if (outcome.ok || outcome.code === 'RECOVERY_CHANGED') {
        setOpen(null);
        router.refresh();
      }
    });
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-h1 font-semibold">
          Owner recoveries <span className="rounded bg-ink-25 px-2 text-meta">Test</span>
        </h1>
        <p className="mt-2 text-meta">
          Test only. Rent refunded to a guest after a succeeded Test payout fixture becomes the
          owner&apos;s obligation. Fee, tax and deposit refunds are excluded. Uncertain refunds are
          reserved, never assigned. No money moves and future payouts are not offset.
        </p>
      </header>
      {!data.canWrite && (
        <p role="status">Read only. Finance write permission is required to assign.</p>
      )}
      {result?.ok && <p role="status">Assigned. Version {result.result.version}.</p>}
      {result?.error && (
        <p role="alert">
          {result.code === 'RECOVERY_CHANGED'
            ? 'Figures changed. The list was refreshed; review and assign again.'
            : (Object.values(result.fields ?? {})[0] ?? result.error)}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-meta">
          <thead>
            <tr>
              {[
                'Owner',
                'Booking',
                'Paid (Test)',
                'Refunded after (Test)',
                'Obligation (Test)',
                'Reserved (Test)',
                'Version',
                '',
              ].map((h) => (
                <th key={h} className={cell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.length === 0 && (
              <tr>
                <td className={cell} colSpan={8}>
                  No Test recovery candidates.
                </td>
              </tr>
            )}
            {data.items.map((row) => (
              <tr key={row.sourceId}>
                <td className={cell}>{row.ownerName ?? row.ownerEmail}</td>
                <td className={cell}>{row.bookingRef}</td>
                <td className={cell}>{money(row.paidMinor)}</td>
                <td className={cell}>{money(row.refundedAfterMinor)}</td>
                <td className={cell}>
                  {money(row.obligationMinor)}
                  {row.assignedMinor != null && (
                    <span className="block text-ink-500">
                      Assigned {money(row.assignedMinor)} (Test)
                    </span>
                  )}
                </td>
                <td className={cell}>{money(row.reservedMinor)}</td>
                <td className={cell}>{row.version}</td>
                <td className={cell}>
                  <button
                    type="button"
                    disabled={pending || !data.canWrite || row.obligationMinor === '0'}
                    onClick={() => {
                      setResult(null);
                      setOpen({ row, requestKey: crypto.randomUUID() });
                    }}
                    className="min-h-11 rounded-md bg-primary px-3 text-white disabled:opacity-50"
                  >
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <dialog open aria-labelledby="assign-title" className="rounded-lg border border-border p-5">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              assign(open.row, new FormData(event.currentTarget).get('reason'));
            }}
          >
            <h2 id="assign-title" className="text-h3">
              Assign Test obligation: {money(open.row.obligationMinor)} (Test)
            </h2>
            <p className="text-meta">
              {open.row.ownerName ?? open.row.ownerEmail} · {open.row.bookingRef}. Records
              responsibility only; nothing is charged or deducted.
            </p>
            <label className="block text-meta font-semibold">
              Reason
              <textarea name="reason" required minLength={10} maxLength={500} className={control} />
            </label>
            <div className="flex gap-3">
              <button disabled={pending} className="min-h-11 rounded-md bg-primary px-4 text-white">
                Assign
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(null)}
                className="min-h-11 rounded-md border border-border px-4"
              >
                Cancel
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
