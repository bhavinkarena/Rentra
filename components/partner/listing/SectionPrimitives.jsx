'use client';
import {
  basicsSchema,
  locationSchema,
  capacitySchema,
  pricingSchema,
  rulesSchema,
} from '@/lib/validation/zod/listing';
export { Field } from '@/components/ui/field';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import Loader2 from '@/components/ui/rentra-loader';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  IN_REVIEW_STATUSES,
  REVIEWED_STATUSES,
  trustFieldSentence,
  trustFieldsTouched,
} from '@/lib/domain/listing-trust';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input as BaseInput } from '@/components/ui/input';
import { sectionAnchorId } from '@/lib/domain/listing-steps';
import { formError as generalFormError } from '@/lib/domain/portal-state';
import { useChrome, useIsWizard } from './chrome';
import ValidationSummary from '@/components/portal/ValidationSummary';
import { DIRTY_EVENT } from '@/components/portal/UnsavedChangesGuard';
function restoreForm(form, data) {
  const seen = {};
  for (const element of form.elements) {
    const { name, type } = element;
    if (!name || ['file', 'hidden', 'submit', 'button'].includes(type)) continue;
    const values = data.getAll(name).map(String);
    if (type === 'checkbox' || type === 'radio') element.checked = values.includes(element.value);
    else if (element.multiple)
      for (const option of element.options) option.selected = values.includes(option.value);
    else {
      const index = (seen[name] = (seen[name] ?? -1) + 1);
      if (index < values.length) element.value = values[index];
    }
  }
}

/**
 * Review corrections for the editor (CP09): which sections Rentra asked the
 * owner to change, and why. Provided by the editor page; empty elsewhere.
 */
const ReviewFlagsContext = createContext({ sections: [], reason: null });

export function ReviewFlags({ sections = [], reason = null, children }) {
  return (
    <ReviewFlagsContext.Provider value={{ sections, reason }}>
      {children}
    </ReviewFlagsContext.Provider>
  );
}

/**
 * The content version this form was rendered from. The API refuses a save made
 * against content that changed since, instead of silently overwriting it. A
 * section's own last save may be newer than the page props, so take the max.
 */
export function VersionField({ listing, states = [] }) {
  const chrome = useChrome();
  const version = Math.max(
    chrome.version || 0,
    Number(listing.contentVersion) || 0,
    ...states.map((state) => Number(state?.contentVersion) || 0),
  );
  return version ? <input type="hidden" name="contentVersion" value={version} /> : null;
}

export const inputCls = `${sharedFieldClass} min-h-12`;

export function Input({ className = '', ...props }) {
  return <BaseInput className={`min-h-12 rounded-md px-3.5 py-3 ${className}`} {...props} />;
}

/** Wraps a section: heading, save state, and the "sent back for review" note. */
/**
 * PROP-03: before a save Rentra must review again, say so and let the owner
 * cancel. Live/paused/hidden: only when an edited input is a trust field.
 * In review: any save means submitting again (the content version moves).
 */
function useReviewWarning(listing) {
  const edited = useRef(new Set());
  const confirmed = useRef(false);
  const [warning, setWarning] = useState(null);
  const status = listing?.status;
  const onEdit = (event) => {
    if (event.target?.name && !event.target.closest('dialog'))
      edited.current.add(event.target.name);
  };
  const intercept = (event) => {
    // The dialog's own form submits through this section too; it is not a save.
    if (!(event.target instanceof HTMLFormElement) || event.target.closest('dialog')) return true;
    if (!listing) return false;
    if (confirmed.current) {
      confirmed.current = false;
      edited.current.clear();
      return false;
    }
    const touched = trustFieldsTouched([...edited.current], listing.trustFields);
    const kind =
      IN_REVIEW_STATUSES.includes(status) && edited.current.size
        ? 'in_review'
        : REVIEWED_STATUSES.includes(status) && touched.length
          ? status
          : null;
    if (!kind) return false;
    event.preventDefault();
    event.stopPropagation();
    setWarning({ kind, touched, form: event.target });
    return true;
  };
  const dialog = warning ? (
    <ConfirmDialog
      open
      title={
        warning.kind === 'in_review'
          ? 'Rentra is reviewing this property'
          : 'This change needs a quick review'
      }
      confirmLabel={warning.kind === 'in_review' ? 'Save changes' : 'Save and send for review'}
      onCancel={() => setWarning(null)}
      onConfirm={() => {
        const { form } = warning;
        setWarning(null);
        confirmed.current = true;
        form.requestSubmit();
      }}
    >
      {warning.kind === 'in_review' ? (
        <p>Saving now means you submit the property again, and Rentra reviews the new version.</p>
      ) : (
        <p>
          Changing {trustFieldSentence(warning.touched)} needs a quick Rentra review.{' '}
          {warning.kind === 'hidden'
            ? 'Rentra reviews it before the property can be restored.'
            : 'Your property is hidden from guests until then, usually within 1 working day.'}{' '}
          Bookings already confirmed are not affected.
        </p>
      )}
    </ConfirmDialog>
  ) : null;
  return { onEdit, intercept, dialog };
}

export function Section({ id, title, intro, state, pending, children }) {
  const { variant, onSaved, onPending, listing } = useChrome();
  const review = useReviewWarning(variant === 'wizard' ? null : listing);
  const flags = useContext(ReviewFlagsContext);
  const flagged = flags.sections.includes(id);
  const wizard = variant === 'wizard';
  const changedElsewhere = state?.code === 'LISTING_CHANGED';
  const sectionRef = useRef(null);
  const submitted = useRef(null);

  const fieldErrors = Object.keys(state?.errors ?? {}).some((key) => key !== '_');
  // Validation failures list their fields; any other failure (network, conflict,
  // permission) must still be said out loud rather than leave a silent form.
  const formError = generalFormError(state);
  const failed = Boolean(formError || fieldErrors);

  useEffect(() => {
    const last = submitted.current;
    if (!failed || !last) return;
    restoreForm(last.form, last.data);
    last.form.dispatchEvent(new Event(DIRTY_EVENT, { bubbles: true }));
  }, [state, failed]);

  const onSubmitCapture = (event) => {
    if (review.intercept(event)) return;
    if (event.target instanceof HTMLFormElement)
      submitted.current = { form: event.target, data: new FormData(event.target) };
  };

  /**
   * Tell the walkthrough a save landed so it can move to the next step.
   *
   * Fires on the transition into `ok`, not on every render, so re-submitting
   * after fixing a validation error still advances exactly once. A failed
   * save never fires, which is what keeps a broken step from sliding past.
   */
  const wasOk = useRef(false);
  useEffect(() => {
    const ok = Boolean(state?.ok);
    if (ok) {
      sectionRef.current
        ?.querySelectorAll('form')
        .forEach((form) => form.dispatchEvent(new Event('rentra:form-saved', { bubbles: true })));
    }
    if (ok && !wasOk.current && onSaved) onSaved(state);
    wasOk.current = ok;
  }, [state, onSaved]);

  // Keep the sticky bar's spinner honest about what the form is doing.
  useEffect(() => {
    onPending?.(Boolean(pending));
  }, [pending, onPending]);

  const validateBlur = (event) => {
    const control = event.target,
      form = control.form;
    if (!form || !control.name) return;
    const schema = {
      basics: basicsSchema,
      location: locationSchema,
      capacity: capacitySchema,
      pricing: pricingSchema,
      rules: rulesSchema,
    }[id];
    if (!schema) return;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    const issue = parsed.success
      ? null
      : parsed.error.issues.find((issue) => issue.path[0] === control.name);
    let feedback = form.querySelector(`[data-blur-field="${CSS.escape(control.name)}"]`);
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.dataset.blurField = control.name;
      feedback.className = 'mt-1 text-tiny text-danger';
      feedback.id = `${control.id || control.name}-blur`;
      control.insertAdjacentElement('afterend', feedback);
    }
    feedback.textContent = issue?.message || '';
    control.setAttribute('aria-invalid', Boolean(issue));
    if (issue) control.setAttribute('aria-describedby', feedback.id);
  };
  const notices = (
    <>
      {flagged ? (
        <p
          className={`${wizard ? 'mt-5' : 'mt-3'} rounded-md border-l-4 border-warning bg-warning-bg p-3 text-meta text-warning`}
        >
          <strong>Rentra asked for changes here.</strong>
          {flags.reason ? ` ${flags.reason}` : ''} Save this section, then resubmit the property.
        </p>
      ) : null}
      {changedElsewhere ? (
        <div
          role="alert"
          className={`${wizard ? 'mt-5' : 'mt-3'} rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger`}
        >
          <p>{formError}</p>
          <p className="mt-1 text-tiny text-ink-700">
            Nothing was saved. Your typed changes are still in the form; copy anything you need,
            because reloading shows the latest saved version.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex min-h-10 items-center rounded-md border border-danger bg-card px-3 text-tiny font-semibold text-danger"
          >
            Reload latest version
          </button>
        </div>
      ) : formError ? (
        <p
          role="alert"
          className={`${wizard ? 'mt-5' : 'mt-3'} rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger`}
        >
          {formError}
          {!state?.errors?._ ? ' Your changes are still in the form — try saving again.' : null}
        </p>
      ) : null}
      <ValidationSummary errors={state?.errors} scope={sectionRef} />

      {/* Trust-field edits on a LIVE listing pull it out of search until
          re-approved. Confirmed bookings are untouched — say so, or it reads
          like a punishment. */}
      {state?.sentBack ? (
        <p
          className={`${wizard ? 'mt-5' : 'mt-3'} rounded-md border-l-4 border-warning bg-warning-bg p-3 text-tiny text-warning`}
        >
          <strong>This change needs re-approval.</strong> Submit the property again so Rentra can
          review it; it stays out of search until approved. Bookings already confirmed are
          unaffected.
        </p>
      ) : null}
    </>
  );

  if (wizard) {
    /**
     * The heading lives here, not in the walkthrough shell, so the wording of
     * each step exists in exactly one place. The shell owns chrome —
     * progress, Back, Next — and nothing that is about this step's content.
     */
    return (
      <section
        id={sectionAnchorId(id)}
        ref={sectionRef}
        onSubmitCapture={onSubmitCapture}
        onBlurCapture={validateBlur}
      >
        <h1 className="text-h1">{title}</h1>
        {intro ? <p className="mt-2 max-w-prose text-body text-ink-600">{intro}</p> : null}
        {notices}
        <div className="mt-7 space-y-5">{children}</div>
      </section>
    );
  }

  return (
    <section
      id={sectionAnchorId(id)}
      ref={sectionRef}
      onSubmitCapture={onSubmitCapture}
      onBlurCapture={validateBlur}
      onInputCapture={review.onEdit}
      onChangeCapture={review.onEdit}
      className="scroll-mt-24 rounded-lg border border-border bg-card p-5"
    >
      {review.dialog}
      <h2 className="text-h3">{title}</h2>
      {intro ? <p className="mt-1 text-meta text-ink-600">{intro}</p> : null}

      {notices}

      <div className="mt-4 space-y-4">{children}</div>

      {state?.ok ? (
        <p
          role="status"
          className="mt-3 inline-flex items-center gap-1.5 text-meta font-semibold text-brand-700"
        >
          <Check className="size-4" aria-hidden="true" /> Saved
        </p>
      ) : null}

      {pending ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-meta text-ink-500">
          <Loader2 className="size-4 " aria-hidden="true" />
          <span className="sr-only">Saving…</span>
        </p>
      ) : null}
    </section>
  );
}

export function SaveButton({ pending, label = 'Save' }) {
  // In the walkthrough the sticky bottom bar is the submit button. Rendering a
  // second one mid-form would give the step two competing primary actions.
  if (useIsWizard()) return null;

  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 " /> : null}
      {label}
    </Button>
  );
}
