'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { disputeCommand } from '@/lib/actions/disputes';
const field = `${sharedFieldClass} mt-1 min-h-11`;
export const disputeBase = (kind) =>
  kind === 'admin' ? '/admin/disputes' : kind === 'owner' ? '/partner/disputes' : '/disputes';
export function DisputeForm({ kind, command, record, context, defaultVisitId }) {
  const router = useRouter(),
    [state, setState] = useState({}),
    [pending, start] = useTransition();
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  return (
    <form
      className="space-y-4 text-meta"
      onChange={() => {
        if (state.preview) setState({});
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set('requestKey', requestKey);
        if (form.get('due')) form.set('due', new Date(form.get('due')).toISOString());
        if (command === 'resolve') {
          form.set('preview', state.preview ? 'false' : 'true');
          if (state.preview) form.set('previewToken', state.preview.previewToken);
        }
        start(async () => {
          const result = await disputeCommand(kind, command, form);
          setState(result);
          if (result.id && !result.preview) {
            if (command === 'create') router.push(`${disputeBase(kind)}/${result.id}`);
            else {
              setRequestKey(crypto.randomUUID());
              router.refresh();
            }
          }
        });
      }}
    >
      {record && (
        <>
          <input type="hidden" name="id" value={record.id} />
          <input type="hidden" name="version" value={record.version} />
        </>
      )}
      {command === 'create' && (
        <>
          <input type="hidden" name="orderId" value={context.id} />
          <label className="block">
            Visit
            <select
              aria-label="Visit"
              name="visitId"
              className={field}
              defaultValue={
                context?.visits?.some((v) => v.id === defaultVisitId)
                  ? defaultVisitId
                  : context?.visits?.[0]?.id
              }
            >
              {context.visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reference} · {String(v.local_day).slice(0, 10)} · {v.state}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Case type
            <select aria-label="Case type" name="kind" className={field}>
              <option value="service">Service dispute</option>
              <option value="deposit">Deposit concern — execution unavailable</option>
              <option value="provider">Provider dispute — submission unavailable</option>
            </select>
          </label>
          <label className="block">
            Shared subject
            <input
              aria-label="Shared subject"
              name="subject"
              required
              minLength={5}
              maxLength={160}
              className={field}
            />
          </label>
          <label className="block">
            Claimed amount in ₹ (not a charge)
            <input
              aria-label="Claimed amount in rupees"
              type="number"
              name="claimedRupees"
              min="0"
              max="1000000"
              step="1"
              inputMode="numeric"
              defaultValue="0"
              className={field}
            />
          </label>
          <p>
            The subject, claim amount and final decision are shared with the booking’s recorded
            parties. Your explanation and photos are private to you and finance staff unless a staff
            response is explicitly shared.
          </p>
        </>
      )}
      {command === 'assign' && (
        <label className="block">
          Finance operator
          <select
            aria-label="Finance operator"
            name="assigneeId"
            defaultValue={record.assigneeId || ''}
            className={field}
          >
            <option value="">Unassigned</option>
            {record.operators.map((o) => (
              <option value={o.id} key={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {command === 'request_response' && (
        <>
          <label className="block">
            Requested participant
            <select aria-label="Requested participant" name="party" className={field}>
              <option value="owner">Owner</option>
              <option value="customer">Customer</option>
            </select>
          </label>
          <label className="block">
            Response deadline (your local time)
            <input
              aria-label="Response deadline"
              type="datetime-local"
              name="due"
              required
              className={field}
            />
          </label>
          <label className="block">
            Summary of the guest’s claim (shared with both participants)
            <textarea
              name="claimSummary"
              className={field}
              minLength={10}
              maxLength={2000}
              defaultValue={record.claimSummary || ''}
              required
            />
          </label>
          <p>
            Write a clear summary without private customer details. The original submission stays
            private.
          </p>
          <p>A deadline requests a response; missing it does not automatically decide liability.</p>
        </>
      )}
      {command === 'resolve' && (
        <label className="block">
          Resolution outcome
          <select aria-label="Resolution outcome" name="outcome" className={field}>
            <option value="no_action">Close without financial action</option>
            <option value="refund_review">Refer to refund operations for separate review</option>
            <option value="support_escalation">Escalate for further support review</option>
          </select>
        </label>
      )}
      {command === 'reply' && kind === 'admin' && (
        <label className="block">
          Response visibility
          <select aria-label="Response visibility" name="audience" className={field}>
            <option value="internal">Internal — finance staff only</option>
            <option value="owner">Owner and finance staff</option>
            <option value="customer">Customer and finance staff</option>
            <option value="everyone">Both participants and finance staff</option>
          </select>
        </label>
      )}
      <label className="block">
        {command === 'resolve' ? 'Reason shared with both participants' : 'Explanation'}
        <textarea
          aria-label={command === 'resolve' ? 'Resolution reason' : 'Explanation'}
          name="body"
          minLength={10}
          maxLength={2000}
          required
          className={field}
        />
      </label>
      {['reply', 'create'].includes(command) && (
        <>
          <label className="block">
            Evidence photos (up to 3, 2MB each)
            <input
              aria-label="Evidence photos"
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className={field}
            />
          </label>
          <p>
            Private evidence uses the response visibility selected above. Participant responses are
            visible only to their author and finance staff.
          </p>
        </>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {state.id && !state.preview && <p role="status">Saved.</p>}
      {state.code === 'DISPUTE_CHANGED' && (
        <button type="button" className="min-h-11 underline" onClick={() => router.refresh()}>
          Reload case
        </button>
      )}
      {state.preview && (
        <section
          aria-label="Resolution preview"
          className="space-y-2 rounded-md border border-border p-4"
        >
          <h3 className="text-h3">Review before resolving</h3>
          <p>{state.preview.outcome.replaceAll('_', ' ')}</p>
          <p className="whitespace-pre-wrap">{state.preview.body}</p>
          <p>{state.preview.effect}</p>
          <p>{state.preview.depositNotice}</p>
          <button type="button" onClick={() => setState({})} className="min-h-11 underline">
            Cancel preview
          </button>
        </section>
      )}
      <button
        disabled={pending}
        className="min-h-11 rounded-full bg-primary px-5 font-semibold text-white"
      >
        {pending
          ? 'Saving…'
          : command === 'create'
            ? 'Open dispute'
            : command === 'reply'
              ? 'Send response'
              : command === 'assign'
                ? 'Save assignment'
                : command === 'request_response'
                  ? 'Request response'
                  : state.preview
                    ? 'Confirm resolution'
                    : 'Preview resolution'}
      </button>
    </form>
  );
}
