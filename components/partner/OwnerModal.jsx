'use client';
import { useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Maximize2, X } from 'lucide-react';

/**
 * URL-driven side sheet for record details. Closing replaces the URL with
 * `closeHref`, so Back, refresh and shared links all behave.
 */
export default function OwnerModal({ title, closeHref, fullHref = null, children }) {
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
      onClick={(event) => {
        if (event.target === event.currentTarget) closeLink.current?.click();
      }}
      className="owner-sheet fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-3xl overflow-hidden border-0 bg-ink-25 p-0 text-foreground shadow-xl backdrop:bg-brand-950/40 md:border-l md:border-border"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-3 sm:px-6">
          <h2 id={id} className="min-w-0 flex-1 truncate text-h4 font-semibold text-ink-900">
            {title}
          </h2>
          {fullHref ? (
            <Link
              href={fullHref}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-meta font-semibold text-ink-700 hover:bg-ink-100"
            >
              <Maximize2 className="size-4" aria-hidden="true" />
              <span className="max-sm:sr-only">Full page</span>
            </Link>
          ) : null}
          <Link
            ref={closeLink}
            href={closeHref}
            scroll={false}
            replace
            aria-label={`Close ${title}`}
            className="grid size-11 shrink-0 place-items-center rounded-md text-ink-600 hover:bg-ink-100"
            onClick={(event) => {
              if (event.defaultPrevented) return;
              event.preventDefault();
              router.replace(closeHref, { scroll: false });
            }}
          >
            <X className="size-5" aria-hidden="true" />
          </Link>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </dialog>
  );
}
