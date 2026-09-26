'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Mobile navigation drawer on the native modal <dialog>.
 *
 * `showModal()` makes the rest of the page inert (focus stays inside), Escape
 * closes it, and the browser returns focus to the menu button on close. No
 * hand-written focus trap to drift out of date.
 */
export default function NavDrawer({ open, onClose, label, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      // A click on the dialog element itself is a click on the backdrop; the panel fills the box.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="fixed inset-y-0 right-auto left-0 m-0 h-dvh max-h-dvh w-[min(86vw,320px)] max-w-none -translate-x-full overflow-y-auto bg-brand-950 p-0 shadow-xl transition-all transition-discrete duration-200 ease-out backdrop:bg-ink-900/0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-200 open:translate-x-0 open:backdrop:bg-ink-900/55 starting:open:-translate-x-full starting:open:backdrop:bg-ink-900/0 motion-reduce:transition-none lg:hidden"
    >
      {/* Always rendered: a closed <dialog> is not displayed, and the close
          animation needs its content. */}
      <div className="relative h-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-md bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
