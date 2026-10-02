'use client';
import { useActionState } from 'react';
import { deletePropertyDraft } from '@/lib/actions/partner';
export default function DeleteDraftButton({ listing }) {
  const [state, action, pending] = useActionState(deletePropertyDraft, {});
  if (listing.status !== 'draft' || listing.hasReviewHistory || listing.hasBookings) return null;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('Delete this private draft? This cannot be undone.'))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={listing.id} />
      <button disabled={pending} className="min-h-11 px-3 text-meta text-danger underline">
        Delete draft
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
