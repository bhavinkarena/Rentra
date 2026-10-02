'use client';
import { useActionState, useRef, useState } from 'react';
import Loader2 from '@/components/ui/rentra-loader';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { submitListing } from '@/lib/actions/partner';

/**
 * Submit (or resubmit) for review. After "Needs changes", submitting without
 * saving anything first asks once — it is almost always a mistake (PROP-02).
 */
export default function SubmitForReview({
  listing,
  ownerApproved = true,
  label = 'Submit for review',
}) {
  const [state, action, pending] = useActionState(submitListing, {});
  const [asking, setAsking] = useState(false);
  const form = useRef(null);
  const confirmed = useRef(false);
  const unchanged = listing.reviewUnchanged && listing.reviewOutcome === 'changes_requested';
  return (
    <>
      <form
        ref={form}
        action={action}
        onSubmit={(event) => {
          if (!unchanged || confirmed.current) return;
          event.preventDefault();
          setAsking(true);
        }}
      >
        <input type="hidden" name="id" value={listing.id} />
        {state.errors?._ ? (
          <p role="alert" className="mb-2 text-meta text-danger">
            {state.errors._}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending || !ownerApproved}>
          {pending ? <Loader2 className="size-4" /> : null}
          {label}
        </Button>
        {!ownerApproved ? (
          <p className="mt-2 text-tiny text-ink-500">
            You can submit once your account is approved.
          </p>
        ) : null}
      </form>
      <ConfirmDialog
        open={asking}
        title="Submit without changes?"
        confirmLabel="Submit anyway"
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          confirmed.current = true;
          form.current?.requestSubmit();
        }}
      >
        <p>
          You haven&apos;t changed anything since Rentra asked for changes. Rentra will likely send
          it back again.
        </p>
      </ConfirmDialog>
    </>
  );
}
