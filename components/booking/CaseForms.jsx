'use client';
import { useActionState, useId, useState, useTransition } from 'react';
import { ClipboardList, MessageSquarePlus, Scale, UserCheck } from 'lucide-react';
import RentraLoader from '@/components/ui/rentra-loader';
import { Outcome, useKeptInputAction } from './EvidenceForms';
import { bookingMoney as money } from '@/lib/domain/booking-record';
import {
  CASE_AUDIENCES as AUDIENCES,
  CASE_TYPES,
  OWNER_CASE_TYPES,
} from '@/lib/domain/booking-cases';
import { addOwnerCaseUpdate, createOwnerCase } from '@/lib/actions/partner';
import {
  addAdminCaseUpdate,
  assignAdminCase,
  createAdminCase,
  previewAdminCase,
  resolveAdminCase,
} from '@/lib/actions/admin';

const field = 'mt-1 block min-h-11 w-full rounded border border-border bg-card p-2';
const button =
  'inline-flex min-h-11 items-center gap-2 rounded bg-brand-700 px-4 font-semibold text-white disabled:opacity-70';
const secondary =
  'inline-flex min-h-11 items-center gap-2 rounded border border-border bg-card px-4 font-semibold text-brand-700 disabled:opacity-70';

function Problem({ message }) {
  return message ? (
    <p role="alert" className="mt-1 text-tiny font-medium text-danger">
      {message}
    </p>
  ) : null;
}

export function CreateCaseForm({ orderId, visits, requestKey, admin = false }) {
  const { state, pending, onSubmit } = useKeptInputAction(
    admin ? createAdminCase : createOwnerCase,
  );
  const [key] = useState(requestKey);
  const [type, setType] = useState(admin ? 'customer_cancellation' : 'owner_cancellation');
  const e = state.errors ?? {};
  const id = useId();
  const types = CASE_TYPES.filter(([value]) => admin || OWNER_CASE_TYPES.includes(value));
  return (
    <details className="rounded-md border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <ClipboardList className="size-4" aria-hidden="true" />
        {admin ? 'Open a booking case' : 'Ask Rentra to cancel or report a problem'}
      </summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="requestKey" value={key} />
        {!admin ? (
          <p className="text-meta text-ink-700">
            Owners cannot cancel a confirmed booking directly. Rentra reviews the request, decides
            the guest&apos;s refund and tells you the outcome here. Nothing changes until then.
          </p>
        ) : null}
        <label className="block">
          Request type
          <select
            name="type"
            className={field}
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {types.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
          <Problem message={e.type} />
        </label>
        <fieldset>
          <legend className="font-medium">Visits this concerns</legend>
          {visits.map((visit) => (
            <label key={visit.id} className="mt-1 flex min-h-11 items-center gap-2">
              <input type="checkbox" name="visitId" value={visit.id} className="size-5" />
              {visit.date} · {visit.slot.replaceAll('_', ' ')} · {visit.reference} (
              {visit.state.replaceAll('_', ' ')})
            </label>
          ))}
          <Problem message={e.visitIds} />
        </fieldset>
        {admin ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              Requested by
              <select name="requesterKind" className={field} defaultValue="customer">
                <option value="customer">Customer</option>
                <option value="owner">Owner</option>
                <option value="admin">Rentra (internal)</option>
              </select>
            </label>
            <label className="block">
              Received through
              <select name="source" className={field} defaultValue="support">
                <option value="support">Support request</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="internal">Internal</option>
              </select>
            </label>
          </div>
        ) : null}
        {admin && type === 'change_request' ? (
          <fieldset className="rounded border border-border p-3">
            <legend className="font-medium">Requested new dates (checked, never held)</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                New date
                <input type="date" name="changeDate" required className={field} />
              </label>
              <label className="block">
                Slot
                <select name="changeSlot" className={field} defaultValue="day">
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                  <option value="full_day">Full day</option>
                </select>
              </label>
              <label className="block">
                Guests
                <input
                  type="number"
                  name="changeGuests"
                  min={1}
                  max={500}
                  required
                  defaultValue={2}
                  className={field}
                />
              </label>
            </div>
          </fieldset>
        ) : null}
        <label className="block" htmlFor={`${id}-reason`}>
          Reason
        </label>
        <textarea
          id={`${id}-reason`}
          name="reason"
          required
          minLength={10}
          maxLength={1000}
          className={field}
        />
        <Problem message={e.reason} />
        <label className="block">
          What outcome is requested (optional)
          <input name="requestedOutcome" maxLength={500} className={field} />
        </label>
        <button disabled={pending} className={button}>
          {pending ? (
            <RentraLoader label="Opening…" />
          ) : admin ? (
            'Open case'
          ) : (
            'Send request to Rentra'
          )}
        </button>
        <Outcome state={state} />
      </form>
    </details>
  );
}

export function CaseMessageForm({ caseId, requestKey, admin = false }) {
  const { state, pending, onSubmit } = useKeptInputAction(
    admin ? addAdminCaseUpdate : addOwnerCaseUpdate,
  );
  const [key] = useState(requestKey);
  const id = useId();
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="requestKey" value={key} />
      <label className="block font-medium" htmlFor={`${id}-body`}>
        <MessageSquarePlus className="mr-1 inline size-4" aria-hidden="true" />
        {admin ? 'Add an update' : 'Message Rentra about this request'}
      </label>
      <textarea
        id={`${id}-body`}
        name="body"
        required
        minLength={2}
        maxLength={2000}
        className={field}
      />
      <Problem message={state.errors?.body} />
      {admin ? (
        <label className="block">
          Who can read it
          <select name="audience" className={field} defaultValue="internal">
            {AUDIENCES.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-tiny text-ink-600">
          Visible to you and Rentra only — never to the guest.
        </p>
      )}
      <button disabled={pending} className={secondary}>
        {pending ? <RentraLoader label="Sending…" /> : 'Add update'}
      </button>
      <Outcome state={state} />
    </form>
  );
}

export function AssignCaseForm({ bookingCase }) {
  const { state, pending, onSubmit } = useKeptInputAction(assignAdminCase);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="caseId" value={bookingCase.id} />
      <input type="hidden" name="version" value={bookingCase.version} />
      <label className="block min-w-48 flex-1">
        <UserCheck className="mr-1 inline size-4" aria-hidden="true" />
        Assigned to
        <select name="assigneeId" className={field} defaultValue={bookingCase.assignee?.id ?? ''}>
          <option value="">Unassigned</option>
          {bookingCase.admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pending} className={secondary}>
        {pending ? <RentraLoader label="Saving…" /> : 'Save assignment'}
      </button>
      <div className="w-full">
        <Outcome state={state} />
        <Problem message={state.errors?.assigneeId} />
      </div>
    </form>
  );
}

function PreviewTable({ result }) {
  const { preview, replacement } = result;
  return (
    <section
      role="status"
      aria-label="Resolution preview"
      className="space-y-2 rounded-md border border-brand-300 bg-brand-50 p-3 text-meta"
    >
      <h4 className="font-semibold">Review before confirming — nothing has changed yet</h4>
      <ul className="space-y-1.5">
        {preview.visits.map((visit) => (
          <li key={visit.id}>
            <strong>
              {visit.date} · {visit.reference}
            </strong>{' '}
            {visit.action === 'cancel' ? (
              <>
                → cancel, release {visit.slot.replaceAll('_', ' ')} inventory, refund{' '}
                {money(visit.refundMinor)}
                {visit.paid
                  ? ` (rent ${money(visit.refundByComponent.rent)}, fee ${money(visit.refundByComponent.fee)})`
                  : ' — no verified payment to refund'}
              </>
            ) : (
              <>
                → {visit.action === 'blocked' ? 'blocked' : 'not changed'}: {visit.reason}
              </>
            )}
          </li>
        ))}
      </ul>
      <p>
        <strong>
          {preview.cancelCount} visit{preview.cancelCount === 1 ? '' : 's'} cancelled · Test refund
          requested {money(preview.refundMinor)}
        </strong>{' '}
        · actual bank refund {money(preview.actualBankRefundMinor)} ·{' '}
        {preview.orderAfter === 'cancelled'
          ? 'the whole booking becomes cancelled'
          : `${preview.remainingVisits} other visit(s) stay booked`}
      </p>
      {replacement ? (
        <p className="rounded bg-card p-2">
          Requested {replacement.dates.join(', ')} ({replacement.slot.replaceAll('_', ' ')},{' '}
          {replacement.guests} guests):{' '}
          {replacement.available
            ? `available right now at ${money(replacement.totalMinor)}`
            : `not available — ${replacement.reason}`}
          . {replacement.note}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Resolve once. Cancelling needs a fresh preview; the confirmation carries its
 * hash, so a change in visits or refunds since the preview is refused.
 */
export function ResolveCaseForm({ bookingCase, requestKey }) {
  const [outcome, setOutcome] = useState('');
  const [basis, setBasis] = useState(bookingCase.defaultBasis);
  const [previewed, preview, previewing] = useActionState(previewAdminCase, {});
  const [stale, setStale] = useState(false);
  const [, startTransition] = useTransition();
  const { state, pending, onSubmit } = useKeptInputAction(resolveAdminCase);
  const [key] = useState(requestKey);
  const id = useId();
  const ready = previewed.preview && !stale && previewed.preview.basis === basis;
  const runPreview = () => {
    const data = new FormData();
    data.set('caseId', bookingCase.id);
    data.set('basis', basis);
    setStale(false);
    startTransition(() => preview(data));
  };
  const cancel = outcome === 'visits_cancelled';
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="caseId" value={bookingCase.id} />
      <input type="hidden" name="version" value={bookingCase.version} />
      <input type="hidden" name="requestKey" value={key} />
      <fieldset>
        <legend className="flex items-center gap-1.5 font-semibold">
          <Scale className="size-4" aria-hidden="true" />
          Outcome
        </legend>
        {[
          ['visits_cancelled', 'Cancel the listed visits (previewed)'],
          ['declined', 'Decline the request'],
          ['no_change', 'Resolve without changing the booking'],
        ].map(([value, text]) => (
          <label key={value} className="mt-1 flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="outcome"
              value={value}
              required
              checked={outcome === value}
              onChange={() => setOutcome(value)}
              className="size-5"
            />
            {text}
          </label>
        ))}
        <Problem message={state.errors?.outcome} />
      </fieldset>
      {cancel ? (
        <fieldset className="space-y-2 rounded border border-border p-3">
          <legend className="font-medium">Refund basis</legend>
          {[
            ['full', 'Full refund of rent and fee — the guest is not at fault'],
            [
              'policy',
              `The guest's accepted policy (${bookingCase.order.cancellationTier ?? 'as booked'})`,
            ],
          ].map(([value, text]) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="basis"
                value={value}
                checked={basis === value}
                onChange={() => {
                  setBasis(value);
                  setStale(true);
                }}
                className="size-5"
              />
              {text}
            </label>
          ))}
          <Problem message={state.errors?.basis} />
          <p className="text-tiny text-ink-600">
            Refunds are capped by what was actually captured and not already refunded. These are
            Test-environment refund obligations; the provider refund itself runs through refund
            operations.
          </p>
          <button type="button" onClick={runPreview} disabled={previewing} className={secondary}>
            {previewing ? <RentraLoader label="Previewing…" /> : 'Preview effects'}
          </button>
          {previewed.error ? (
            <p role="alert" className="text-danger">
              {previewed.error}
            </p>
          ) : null}
          {ready ? <PreviewTable result={previewed} /> : null}
          {ready ? <input type="hidden" name="hash" value={previewed.hash} /> : null}
        </fieldset>
      ) : null}
      <label className="block" htmlFor={`${id}-note`}>
        Resolution note
      </label>
      <textarea
        id={`${id}-note`}
        name="note"
        required
        minLength={10}
        maxLength={1000}
        className={field}
      />
      <Problem message={state.errors?.note ?? state.errors?.hash} />
      <label className="block">
        Who can read the resolution
        <select
          name="audience"
          className={field}
          defaultValue={
            bookingCase.requesterKind === 'owner'
              ? 'client'
              : bookingCase.requesterKind === 'customer'
                ? 'customer'
                : 'internal'
          }
        >
          {AUDIENCES.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pending || !outcome || (cancel && !ready)} className={button}>
        {pending ? (
          <RentraLoader label="Resolving…" />
        ) : cancel ? (
          ready ? (
            `Confirm: cancel ${previewed.preview.cancelCount} visit(s) and request ${money(previewed.preview.refundMinor)} Test refund`
          ) : (
            'Preview before confirming'
          )
        ) : (
          'Resolve case'
        )}
      </button>
      <Outcome state={state} />
    </form>
  );
}
