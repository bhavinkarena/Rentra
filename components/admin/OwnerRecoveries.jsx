'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  assignOwnerRecovery,
  checkOwnerRepaymentLink,
  resolveOwnerRepaymentLink,
  createOwnerRepaymentLink,
  confirmOwnerNoticeReceipt,
} from '@/lib/actions/hotel-finance';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { control } from './PropertyCommandForm';

// API sends integer paise as strings; amounts here stay within safe integers.
const money = (minor) => formatINRMinor(Number(minor));
const cell = 'px-3 py-2 text-left';
const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
const VIA = {
  portal_view: 'portal view',
  owner_ack: 'owner acknowledged',
  admin_confirmed: 'admin confirmed',
};

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
  // One request key per row until success or a definite 4xx, so a retry after a lost response replays.
  const [linkKeys, setLinkKeys] = useState({});
  const link = (row) =>
    startTransition(async () => {
      // The retry replays the exact first payload (key + hash + version), not the refreshed row.
      const body = linkKeys[row.sourceId] ?? {
        hash: row.hash,
        expectedVersion: row.version,
        requestKey: crypto.randomUUID(),
      };
      setLinkKeys((keys) => ({ ...keys, [row.sourceId]: body }));
      let outcome;
      try {
        outcome = await createOwnerRepaymentLink(row.sourceId, body);
      } catch {
        setResult({ error: 'Could not reach Rentra. Try again.' });
        return;
      }
      if (outcome.ok || (outcome.status >= 400 && outcome.status < 500))
        setLinkKeys(({ [row.sourceId]: _done, ...keys }) => keys);
      setResult(outcome.ok ? { linked: outcome.result } : outcome);
      router.refresh();
    });
  const check = (row) =>
    startTransition(async () => {
      let outcome;
      try {
        outcome = await checkOwnerRepaymentLink(row.sourceId);
      } catch {
        outcome = { error: 'Could not reach Rentra. Try again.' };
      }
      setResult(outcome.ok ? { checked: outcome.result.settled.length } : outcome);
      router.refresh();
    });
  const [closing, setClosing] = useState(null);
  const resolve = (row, reason) =>
    startTransition(async () => {
      let outcome;
      try {
        outcome = await resolveOwnerRepaymentLink(row.sourceId, { linkId: row.link.id, reason });
      } catch {
        setResult({ error: 'Could not reach Rentra. Try again.' });
        return;
      }
      setResult(outcome.ok ? { closedLink: outcome.result } : outcome);
      if (outcome.ok) setClosing(null);
      router.refresh();
    });
  // Story 2.19: one kept request key per row until success or a definite 4xx, so a retry replays.
  const [receipt, setReceipt] = useState(null);
  const [receiptKeys, setReceiptKeys] = useState({});
  const confirmReceipt = (row, form) =>
    startTransition(async () => {
      const at = new Date(form.get('receivedAt'));
      if (Number.isNaN(at.getTime())) {
        setResult({ error: 'Enter a valid receipt date and time.' });
        return;
      }
      const values = {
        receivedAt: at.toISOString(),
        reason: String(form.get('reason') ?? ''),
        expectedVersion: row.notice.version,
      };
      // Reuse the kept key only for an identical retry; any changed value is a new request.
      const kept = receiptKeys[row.sourceId];
      const same =
        kept &&
        kept.receivedAt === values.receivedAt &&
        kept.reason === values.reason &&
        kept.expectedVersion === values.expectedVersion;
      const body = same ? kept : { ...values, requestKey: crypto.randomUUID() };
      setReceiptKeys((keys) => ({ ...keys, [row.sourceId]: body }));
      let outcome;
      try {
        outcome = await confirmOwnerNoticeReceipt(row.sourceId, body);
      } catch {
        setResult({ error: 'Could not reach Rentra. Try again.' });
        return;
      }
      if (outcome.ok || (outcome.status >= 400 && outcome.status < 500))
        setReceiptKeys(({ [row.sourceId]: _done, ...keys }) => keys);
      setResult(outcome.ok ? { received: outcome.result } : outcome);
      if (outcome.ok || outcome.code === 'NOTICE_CHANGED') setReceipt(null);
      router.refresh();
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
      {result?.linked && (
        <p role="status">Test repayment link open for {money(result.linked.amountMinor)} (Test).</p>
      )}
      {result?.checked != null && (
        <p role="status">
          {result.checked
            ? 'Captured Test payment found and settled.'
            : 'No new captured Test payment. State unchanged.'}
        </p>
      )}
      {result?.closedLink && (
        <p role="status">
          {result.closedLink.state === 'paid'
            ? 'Captured Test payment found and settled.'
            : 'Link closed (Test). Create a new Test repayment link when ready.'}
        </p>
      )}
      {result?.received && (
        <p role="status">Receipt recorded. Due {when(result.received.dueAt)} (Test).</p>
      )}
      {result?.ok && <p role="status">Assigned. Version {result.result.version}.</p>}
      {result?.error && (
        <p role="alert">
          {result.code === 'RECOVERY_CHANGED'
            ? 'Figures changed. The list was refreshed; review and assign again.'
            : result.code === 'NOTICE_CHANGED'
              ? 'The notice changed. The list was refreshed; review and confirm again.'
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
                'Outstanding (Test)',
                'Repayment link (Test)',
                'Notice (Test)',
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
                <td className={cell} colSpan={11}>
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
                <td className={cell}>{money(row.outstandingMinor)}</td>
                <td className={cell}>
                  {row.link && (
                    <span className="block">
                      {row.link.state.replace('_', ' ')} · {money(row.link.amountMinor)} (Test)
                      {row.link.excessMinor !== '0' &&
                        ` · excess ${money(row.link.excessMinor)} (Test) to return`}
                    </span>
                  )}
                  {row.recoveryId && row.outstandingMinor !== '0' && (
                    <button
                      type="button"
                      disabled={pending || !data.canWrite}
                      onClick={() => link(row)}
                      className="min-h-11 rounded-md border border-border px-3 disabled:opacity-50"
                    >
                      {row.link?.state === 'open'
                        ? 'Replace link (Test)'
                        : 'Create Test repayment link'}
                    </button>
                  )}
                  {row.link && row.link.state !== 'paid' && (
                    <button
                      type="button"
                      disabled={pending || !data.canWrite}
                      onClick={() => check(row)}
                      className="mt-1 min-h-11 rounded-md border border-border px-3 disabled:opacity-50"
                    >
                      Check payment again (Test)
                    </button>
                  )}
                  {row.link?.state === 'needs_review' && (
                    <button
                      type="button"
                      disabled={pending || !data.canWrite}
                      onClick={() => setClosing(row)}
                      className="mt-1 min-h-11 rounded-md border border-border px-3 disabled:opacity-50"
                    >
                      Close link (Test)
                    </button>
                  )}
                </td>
                <td className={cell}>
                  {row.notice &&
                    (row.notice.receivedAt ? (
                      <span className="block">
                        Received {when(row.notice.receivedAt)} (
                        {VIA[row.notice.receivedVia] ?? row.notice.receivedVia})
                        <span className="block text-ink-500">
                          Reminder {when(row.notice.reminderAt)} · Due {when(row.notice.dueAt)}
                        </span>
                      </span>
                    ) : (
                      <span className="block text-ink-500">Issued; not received yet</span>
                    ))}
                  {row.notice && (
                    <button
                      type="button"
                      disabled={pending || !data.canWrite}
                      onClick={() => {
                        setResult(null);
                        setReceipt(row);
                      }}
                      className="mt-1 min-h-11 rounded-md border border-border px-3 disabled:opacity-50"
                    >
                      Confirm receipt (Test)
                    </button>
                  )}
                </td>
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
      {receipt && (
        <dialog
          open
          aria-labelledby="receipt-title"
          className="rounded-lg border border-border p-5"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              confirmReceipt(receipt, new FormData(event.currentTarget));
            }}
          >
            <h2 id="receipt-title" className="text-h3">
              Confirm notice receipt (Test): {receipt.bookingRef}
            </h2>
            <p className="text-meta">
              Only an earlier time moves the reminder (+5 days) and due date (+7 days). Amounts
              never change.
            </p>
            <label className="block text-meta font-semibold">
              Received at
              <input type="datetime-local" name="receivedAt" required className={control} />
            </label>
            <label className="block text-meta font-semibold">
              Reason
              <textarea name="reason" required minLength={10} maxLength={500} className={control} />
            </label>
            <div className="flex gap-3">
              <button disabled={pending} className="min-h-11 rounded-md bg-primary px-4 text-white">
                Confirm receipt (Test)
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setReceipt(null)}
                className="min-h-11 rounded-md border border-border px-4"
              >
                Cancel
              </button>
            </div>
          </form>
        </dialog>
      )}
      {closing && (
        <dialog open aria-labelledby="close-title" className="rounded-lg border border-border p-5">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              resolve(closing, new FormData(event.currentTarget).get('reason'));
            }}
          >
            <h2 id="close-title" className="text-h3">
              Close Test repayment link: {money(closing.link.amountMinor)} (Test)
            </h2>
            <p className="text-meta">
              Razorpay Test is checked again first. A captured payment settles instead; what is due
              never changes.
            </p>
            <label className="block text-meta font-semibold">
              Reason
              <textarea name="reason" required minLength={10} maxLength={500} className={control} />
            </label>
            <div className="flex gap-3">
              <button disabled={pending} className="min-h-11 rounded-md bg-primary px-4 text-white">
                Close link (Test)
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setClosing(null)}
                className="min-h-11 rounded-md border border-border px-4"
              >
                Cancel
              </button>
            </div>
          </form>
        </dialog>
      )}
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
