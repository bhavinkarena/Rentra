'use client';

import { useEffect } from 'react';

export const DIRTY_EVENT = 'rentra:form-dirty';
const MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

/**
 * Warns before leaving a multi-section editor with unsaved input.
 *
 * A form becomes dirty on its first input and clean when it is submitted; a
 * form whose save failed marks itself dirty again with DIRTY_EVENT. Covers
 * reload/close (beforeunload) and in-app links (capture-phase click, before
 * Next's router sees it).
 *
 * ponytail: browser Back inside the app is not intercepted — the App Router
 * has no cancellable navigation event. Add it if Back loses real work.
 */
export default function UnsavedChangesGuard() {
  useEffect(() => {
    const dirty = new Set();
    const mark = (event) => {
      const form = event.target?.closest?.('form') ?? event.target;
      if (form instanceof HTMLFormElement) dirty.add(form);
    };
    const clear = (event) => dirty.delete(event.target);
    const beforeUnload = (event) => {
      if (!dirty.size) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event) => {
      if (!dirty.size || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target?.closest?.('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      // An in-page section link (#photos) does not leave the editor.
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      if (window.confirm(MESSAGE)) {
        dirty.clear();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('input', mark);
    document.addEventListener(DIRTY_EVENT, mark);
    document.addEventListener('submit', clear);
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('input', mark);
      document.removeEventListener(DIRTY_EVENT, mark);
      document.removeEventListener('submit', clear);
      document.removeEventListener('click', click, true);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  return null;
}
