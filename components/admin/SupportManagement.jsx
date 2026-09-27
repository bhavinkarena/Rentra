'use client';
import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { manageSupport } from '@/lib/actions/admin';
const field = 'mt-1 block min-h-11 w-full rounded border border-border bg-card p-2';
export default function SupportManagement({ record }) {
  const [state, action, pending] = useActionState(manageSupport, {}),
    [, startTransition] = useTransition(),
    router = useRouter();
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <h2 className="text-h3">Assignment and escalation</h2>
      <input type="hidden" name="id" value={record.id} />
      <input type="hidden" name="version" value={record.version} />
      <label className="block">
        Assigned operator
        <select className={field} name="assignedTo" defaultValue={record.assignedTo || ''}>
          <option value="">Unassigned</option>
          {record.operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Priority
        <select className={field} name="priority" defaultValue={record.priority}>
          <option value="normal">Normal</option>
          <option value="urgent">Urgent — escalation requested</option>
        </select>
      </label>
      <label className="block">
        Related support case ID (optional)
        <input
          className={field}
          name="relatedRequestId"
          defaultValue={record.relatedRequestId || ''}
        />
      </label>
      <p>
        Links are for admins only. Linking never shares messages or attachments with the other
        participant.
      </p>
      <label className="block">
        Reason
        <textarea className={field} name="reason" minLength={5} maxLength={500} required />
      </label>
      <button disabled={pending} className="min-h-11 rounded bg-brand-700 px-4 text-white">
        {pending ? 'Saving…' : 'Save assignment'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
      {state.code === 'STALE_REQUEST' && (
        <button type="button" className="min-h-11 underline" onClick={() => router.refresh()}>
          Reload conversation
        </button>
      )}
    </form>
  );
}
