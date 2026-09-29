'use client';
import { useActionState, useState } from 'react';
import { commandOperationalIncident } from '@/lib/actions/admin';

export default function IncidentControls({ code, incident, count, initialRequestKey }) {
  const [state, action, pending] = useActionState(commandOperationalIncident, {});
  const [requestKey, setRequestKey] = useState(initialRequestKey);
  const [operation, setOperation] = useState(
    incident ? (incident.status === 'resolved' ? 'reopen' : 'note') : 'open',
  );
  const allowed = !incident
    ? ['open']
    : incident.status === 'resolved'
      ? ['reopen']
      : ['note', 'assign', 'acknowledge', 'snooze', 'escalate', 'resolve'];
  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="expectedVersion" value={incident?.version ?? 0} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <label className="block text-meta font-semibold">
        Action
        <select
          className="mt-2 min-h-11 w-full rounded-md border border-input p-2 text-base md:text-sm bg-card text-foreground"
          name="action"
          value={operation}
          onChange={(event) => {
            setOperation(event.target.value);
            setRequestKey(crypto.randomUUID());
          }}
        >
          {allowed.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {operation === 'assign' ? (
        <label className="block text-meta">
          Active administrator UUID
          <input
            required
            name="assigneeId"
            pattern="[a-fA-F0-9-]{36}"
            className="mt-2 min-h-11 w-full rounded-md border border-input p-2 text-base md:text-sm bg-card text-foreground"
            defaultValue={incident?.assignee_id ?? ''}
          />
        </label>
      ) : null}
      {operation === 'snooze' ? (
        <label className="block text-meta">
          Snooze duration
          <select
            name="snoozeHours"
            className="mt-2 min-h-11 w-full rounded-md border border-input p-2 text-base md:text-sm bg-card text-foreground"
          >
            <option value="1">1 hour</option>
            <option value="4">4 hours</option>
            <option value="24">24 hours</option>
          </select>
        </label>
      ) : null}
      <label className="block text-meta">
        Reason or handoff note
        <textarea
          required
          minLength={8}
          maxLength={2000}
          name="note"
          rows={3}
          className="mt-2 w-full rounded-md border border-input p-2 text-base md:text-sm bg-card text-foreground"
        />
      </label>
      {operation === 'resolve' && count > 0 ? (
        <p role="alert" className="text-danger">
          The measured signal is still active. Resolution is unavailable until it clears.
        </p>
      ) : null}
      <button
        disabled={pending || !requestKey || (operation === 'resolve' && count > 0)}
        className="min-h-11 rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:bg-muted disabled:text-muted-foreground"
      >
        {pending ? 'Recording…' : 'Record incident action'}
      </button>
      {state.error ? (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      ) : null}
      {state.replayed !== undefined ? (
        <p role="status">Action recorded. Refresh for the latest incident version.</p>
      ) : null}
    </form>
  );
}
