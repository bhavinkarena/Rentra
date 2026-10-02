'use client';
import { useActionState, useRef, useState } from 'react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { deletePropertyDraft } from '@/lib/actions/partner';

export default function DeleteDraftButton({ listing }) {
  const [state, action, pending] = useActionState(deletePropertyDraft, {});
  const [asking, setAsking] = useState(false);
  const form = useRef(null);
  if (listing.status !== 'draft' || listing.hasReviewHistory || listing.hasBookings) return null;
  return (
    <>
      <form ref={form} action={action}>
        <input type="hidden" name="id" value={listing.id} />
        <button
          type="button"
          disabled={pending}
          onClick={() => setAsking(true)}
          className="min-h-11 px-3 text-meta text-danger underline"
        >
          {pending ? 'Deleting…' : 'Delete draft'}
        </button>
        {state.error && <p role="alert">{state.error}</p>}
      </form>
      <ConfirmDialog
        open={asking}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        danger
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          form.current?.requestSubmit();
        }}
      >
        <p>The draft is private and has never been submitted. Deleting it cannot be undone.</p>
      </ConfirmDialog>
    </>
  );
}
