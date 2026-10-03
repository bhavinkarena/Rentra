'use client';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useActionState, useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ownerReviewReply } from '@/lib/actions/partner';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
export default function OwnerReviewReply({ review }) {
  const [state, action, pending] = useActionState(async (previous, form) => {
    const result = await ownerReviewReply(previous, form);
    if (result.message) toast.success(result.message);
    return result;
  }, {});
  const [deleting, setDeleting] = useState(false);
  const [body, setBody] = useState(review.owner_reply || '');
  const [, start] = useTransition();
  const router = useRouter();
  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [state, router]);
  return (
    <>
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={review.id} />
        <input type="hidden" name="version" value={review.version} />
        <label className="block">
          Your public reply
          <textarea
            className={`${fieldClass} mt-1`}
            name="body"
            required
            minLength={10}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            aria-describedby={`reply-count-${review.id}`}
          />
        </label>
        <p id={`reply-count-${review.id}`} className="text-sm text-ink-600">
          {body.length}/2000 · Keep guest contact details private.
        </p>
        {Object.entries(state.errors || {}).map(([key, messages]) => (
          <p key={key} role="alert">
            {Array.isArray(messages) ? messages.join(' ') : messages}
          </p>
        ))}
        {state.error && <p role="alert">{state.error}</p>}
        <div className="flex gap-3">
          <button className={buttonVariants()} disabled={pending}>
            {pending ? 'Saving…' : review.owner_reply ? 'Save reply' : 'Post reply'}
          </button>
          {review.owner_reply && (
            <button
              type="button"
              disabled={pending}
              className="min-h-11 underline"
              onClick={() => setDeleting(true)}
            >
              Delete reply
            </button>
          )}
        </div>
        {state.code === 'CHANGED' && (
          <button type="button" className="min-h-11 underline" onClick={() => router.refresh()}>
            Reload review
          </button>
        )}
      </form>
      <ConfirmDialog
        open={deleting}
        title="Delete your public reply?"
        confirmLabel="Delete reply"
        danger
        pending={pending}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          const data = new FormData();
          data.set('id', review.id);
          data.set('version', review.version);
          data.set('mode', 'delete');
          setDeleting(false);
          start(() => action(data));
        }}
      >
        <p>Your reply will be removed from the public review. The guest review stays.</p>
      </ConfirmDialog>
    </>
  );
}
