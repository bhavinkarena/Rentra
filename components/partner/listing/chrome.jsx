'use client';

import { createContext, useContext, useMemo } from 'react';

/**
 * Which shell the listing sections are rendering inside.
 *
 * The nine sections are identical in both places — only the frame differs:
 *
 *   'card'    the manage page. Each section is a bordered card with its own
 *             heading and its own Save button. Random access, for editing one
 *             thing on a live listing.
 *
 *   'wizard'  the walkthrough. One section fills the screen, the heading is
 *             the page heading, and the Save button is gone because the
 *             sticky bar at the bottom owns "Save and continue".
 *
 * Context rather than props so none of the nine section signatures change.
 * Prop-drilling a `variant` through nine components to reach two shared
 * helpers is how a small change turns into a large diff.
 */
const ChromeContext = createContext({
  variant: 'card',
  onSaved: null,
  onPending: null,
});

/**
 * The id the sticky bar's submit button targets.
 *
 * Only ever applied in wizard mode. Seven forms sharing one id on the manage
 * page would be duplicate-id invalid HTML and the button would submit
 * whichever the browser found first.
 */
export const STEP_FORM_ID = 'listing-step-form';

export function ListingChrome({
  variant = 'card',
  onSaved = null,
  onPending = null,
  children,
}) {
  /**
   * `onPending` reports upward so the sticky bar can spin and disable while a
   * save is in flight. The bar sits outside the form, so `useFormStatus` is
   * not available to it — the section has to hand the state up.
   */
  const value = useMemo(
    () => ({ variant, onSaved, onPending }),
    [variant, onSaved, onPending],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome() {
  return useContext(ChromeContext);
}

export function useIsWizard() {
  return useContext(ChromeContext).variant === 'wizard';
}

/** The form id in wizard mode, `undefined` on the manage page. */
export function useStepFormId() {
  return useIsWizard() ? STEP_FORM_ID : undefined;
}
