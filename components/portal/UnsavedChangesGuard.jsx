'use client';

import { useEffect } from 'react';

export const DIRTY_EVENT = 'rentra:form-dirty';
const MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

/**
 * Only forms that save in place are tracked. Filter forms navigate: they carry a
 * real URL `action` or `method="get"`. React Server Action forms have no
 * `method` (so `form.method` reports "get") and a `javascript:` or absent action.
 */
export function tracksForm(form) {
  if (!(form instanceof HTMLFormElement)) return false;
  const action = form.getAttribute('action');
  return (
    form.getAttribute('method')?.toLowerCase() !== 'get' &&
    (!action || action.startsWith('javascript:')) &&
    form.getAttribute('role') !== 'search' &&
    form.dataset.unsavedGuard !== 'off'
  );
}

/**
 * Warn before leaving dirty forms or an upload in progress.
 *
 * Mounted once by PortalShell and WizardShell (DS-07). A form is dirty from its
 * first input until it is submitted, or, with `data-unsaved-until-saved`, until
 * it dispatches `rentra:form-saved` (policy forms: a preview is not a save).
 * A failed Section save re-dirties its form. Forms that leave the DOM
 * (a server action redirected) stop counting. The browser Back button is
 * intercepted only while something is dirty.
 */
export default function UnsavedChangesGuard() {
  useEffect(() => {
    const dirty = new Set();
    let sentinel = false;
    const pending = () => {
      for (const form of dirty) if (!form.isConnected) dirty.delete(form);
      return dirty.size > 0 || Boolean(window.rentraUploadPending);
    };
    const mark = (event) => {
      const form = event.target?.closest?.('form') ?? event.target;
      if (!tracksForm(form)) return;
      dirty.add(form);
      if (!sentinel) {
        // One extra entry at the same URL, so Back pops it instead of the page.
        history.pushState({ ...history.state, rentraDraftGuard: true }, '', location.href);
        sentinel = true;
      }
    };
    const clear = (event) => dirty.delete(event.target);
    const submit = (event) => {
      if (!('unsavedUntilSaved' in (event.target?.dataset ?? {}))) clear(event);
    };
    const beforeUnload = (event) => {
      if (!pending()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event) => {
      if (!pending() || event.defaultPrevented || event.button !== 0) return;
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
    const pop = () => {
      if (!sentinel) return;
      sentinel = false; // The sentinel entry was just popped.
      if (!pending()) return;
      if (window.confirm(MESSAGE)) {
        dirty.clear();
        history.back();
        return;
      }
      history.pushState({ ...history.state, rentraDraftGuard: true }, '', location.href);
      sentinel = true;
    };

    window.addEventListener('popstate', pop);
    document.addEventListener('rentra:form-saved', clear);
    document.addEventListener('submit', submit);
    document.addEventListener('input', mark);
    document.addEventListener(DIRTY_EVENT, mark);
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('popstate', pop);
      document.removeEventListener('rentra:form-saved', clear);
      document.removeEventListener('submit', submit);
      document.removeEventListener('input', mark);
      document.removeEventListener(DIRTY_EVENT, mark);
      document.removeEventListener('click', click, true);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  return null;
}
