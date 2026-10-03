'use client';
import { useEffect, useId, useRef } from 'react';

/**
 * One confirmation dialog for owner decisions that are hard to undo (DS-03):
 * native <dialog>, so focus trapping, Escape and the backdrop come from the
 * browser. Extra inputs go in `children`; `onConfirm` receives their FormData.
 * Render it outside other forms — a form cannot nest inside a form.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel?.();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-ink-900 shadow-lg backdrop:bg-ink-900/40"
    >
      <form
        className="p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm?.(new FormData(event.currentTarget));
        }}
      >
        <h2 id={`${id}-title`} className="text-h4 font-bold">
          {title}
        </h2>
        <div className="mt-2 space-y-3 text-meta text-ink-700">{children}</div>
        <div
          data-mobile-actions
          className="sticky bottom-0 mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
        >
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-md border border-border px-4 text-meta font-semibold text-ink-800 hover:bg-ink-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className={`min-h-11 rounded-md px-4 text-meta font-semibold text-white disabled:opacity-60 ${
              danger ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
