'use client';
import { useActionState } from 'react';
import { saveBookingNote } from '@/lib/actions/partner';
export default function BookingNote({ record }) {
  const [state, action, pending] = useActionState(saveBookingNote, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={record.id} />
      <label className="block">
        Private note (owner and assigned caretakers only)
        <textarea
          name="body"
          defaultValue={record.ownerNote || ''}
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded-md border p-3"
        />
      </label>
      <button disabled={pending} className="min-h-11 rounded-md border px-4">
        {pending ? 'Saving…' : 'Save note'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.ok && <p role="status">Note saved.</p>}
    </form>
  );
}
