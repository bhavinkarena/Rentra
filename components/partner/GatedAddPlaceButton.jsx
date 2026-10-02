'use client';
import { useRef, useState, useEffect } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { Lock, X } from 'lucide-react';
import CreateListingButton from './CreateListingButton';
export default function GatedAddPlaceButton({ unlocked, message, onLockedClick }) {
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, [open]);
  if (unlocked) return <CreateListingButton />;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onLockedClick?.(1);
        }}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-card px-5 py-3 text-meta font-semibold text-ink-800"
      >
        <Lock className="size-4" aria-hidden="true" />
        Add property
      </button>
      {open ? (
        <dialog
          ref={dialog}
          aria-labelledby="add-property-title"
          className="fixed m-auto w-[calc(100%_-_2rem)] max-w-md rounded-lg border border-border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/30"
          onCancel={() => setOpen(false)}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="add-property-title" className="text-h3">
              {message?.title ?? 'Property setup is unavailable'}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-ink-100"
            >
              <X className="size-5" />
            </button>
          </div>
          {message?.items?.length ? (
            <ul className="mt-3">
              {message.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-center justify-between gap-3 text-meta font-semibold text-brand-700 underline"
                  >
                    <span>{item.label}</span>
                    {item.minutes ? <span>{item.minutes} min</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-meta text-ink-600">
            {message?.body ?? 'Contact Rentra for help with your account.'}
          </p>
        </dialog>
      ) : null}
    </>
  );
}
