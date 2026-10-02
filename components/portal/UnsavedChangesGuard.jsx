'use client';

import { useEffect } from 'react';

export const DIRTY_EVENT = 'rentra:form-dirty';
const MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

/** Warn before leaving dirty forms or an upload in progress. */
export default function UnsavedChangesGuard({ browserBack = false }) {
  useEffect(() => {
    const dirty = new Set();
    const mark = (event) => {
      const form = event.target?.closest?.('form') ?? event.target;
      if (form instanceof HTMLFormElement) dirty.add(form);
    };
    const clear = (event) => dirty.delete(event.target);
    const beforeUnload = (event) => {
      if (!dirty.size && !window.rentraUploadPending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event) => {
      if (
        (!dirty.size && !window.rentraUploadPending) ||
        event.defaultPrevented ||
        event.button !== 0
      )
        return;
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

    let skipping = false;
    const pop = () => {
      if (skipping) {
        skipping = false;
        return;
      }
      if ((dirty.size || window.rentraUploadPending) && !window.confirm(MESSAGE)) {
        history.go(1);
        return;
      }
      dirty.clear();
      skipping = true;
      history.back();
    };
    if (browserBack) {
      history.pushState({ ...history.state, rentraDraftGuard: true }, '', location.href);
      window.addEventListener('popstate', pop);
    }
    document.addEventListener('rentra:form-saved', clear);
    document.addEventListener('input', mark);
    document.addEventListener(DIRTY_EVENT, mark);

    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      if (browserBack) window.removeEventListener('popstate', pop);
      document.removeEventListener('rentra:form-saved', clear);
      document.removeEventListener('input', mark);
      document.removeEventListener(DIRTY_EVENT, mark);

      document.removeEventListener('click', click, true);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [browserBack]);

  return null;
}
