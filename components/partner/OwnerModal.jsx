'use client';
import { useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
export default function OwnerModal({ title, closeHref, children }) {
  const dialog = useRef(null),
    closeLink = useRef(null),
    id = useId(),
    router = useRouter();
  useEffect(() => {
    const node = dialog.current,
      previous = document.activeElement;
    node.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      data-owner-modal
      ref={dialog}
      aria-labelledby={id}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        closeLink.current?.click();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-6xl overflow-hidden rounded-2xl border border-border bg-ink-25 p-0 text-foreground shadow-2xl backdrop:bg-brand-950/50"
    >
      <header className="flex items-center justify-between gap-3 border-b bg-card px-5 py-3">
        <h2 id={id} className="text-h3 font-semibold">
          {title}
        </h2>
        <Link
          ref={closeLink}
          href={closeHref}
          scroll={false}
          replace
          aria-label={`Close ${title}`}
          className="grid size-11 shrink-0 place-items-center rounded-lg border hover:bg-ink-50"
          onClick={(event) => {
            if (event.defaultPrevented) return;
            event.preventDefault();
            router.replace(closeHref, { scroll: false });
          }}
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
      </header>
      <div className="max-h-[calc(92dvh_-_4.5rem)] overflow-y-auto p-4 sm:p-6">{children}</div>
    </dialog>
  );
}
