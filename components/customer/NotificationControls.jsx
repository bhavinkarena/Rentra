'use client';
import { useActionState } from 'react';
import { manageNotification } from '@/lib/notifications/actions';
export default function NotificationControls({ id, unknown }) {
  const [state, action, pending] = useActionState(manageNotification, {});
  return <form action={action} className="mt-2 space-y-2"><input type="hidden" name="id" value={id}/><input type="hidden" name="operation" value={unknown ? 'reconcile' : 'retry'}/>
    {unknown ? <label className="block">Original Twilio message SID<input required pattern="SM[a-fA-F0-9]{32}" name="sid" className="block min-h-11 w-full rounded border border-border p-2"/><span className="text-meta">Fetches and verifies the original message. Does not send another SMS.</span></label> : null}
    <button disabled={pending} className="min-h-11 text-brand-700 underline">{unknown ? 'Reconcile original delivery' : 'Retry safe delivery'}</button>
    {state.error ? <p role="alert">{state.error}</p> : null}{state.message ? <p role="status">{state.message}</p> : null}</form>;
}
