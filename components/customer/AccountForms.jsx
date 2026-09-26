'use client';
import OtpDialog, { OtpInput } from '@/components/auth/OtpDialog';
import { ArrowRight, Check, Smartphone } from 'lucide-react';
import RentraLoader from '@/components/ui/rentra-loader';

import { signalSavedChange } from './SavedPlacesProvider';
import { useActionState, useEffect, useRef, useState } from 'react';
import {
  updateCustomerProfile,
  submitPrivacyRequest,
  requestPhoneChange,
  confirmPhoneChange,
} from '@/lib/actions/customer';
import { logoutCustomer } from '@/lib/actions/auth';

const control =
  'mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';
const button =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50';
export function FormStatus({ state }) {
  const message = useRef(null);
  useEffect(() => {
    if (state.error) message.current?.focus();
  }, [state]);
  return state.error ? (
    <p
      ref={message}
      role="alert"
      tabIndex={-1}
      className="rounded-md border border-danger p-3 text-meta"
    >
      {state.error}
    </p>
  ) : state.ok ? (
    <p role="status" className="rounded-md bg-brand-50 p-3 text-meta text-brand-800 break-words">
      {state.ok}
    </p>
  ) : null;
}
function Field({ label, ...props }) {
  return (
    <label className="block text-meta font-medium">
      {label}
      <input className={control} {...props} />
    </label>
  );
}

export function ProfileForm({ account, onboarding = false }) {
  const [state, action, pending] = useActionState(async (previous, form) => {
    const result = await updateCustomerProfile(previous, form);
    if (result.ok) window.dispatchEvent(new Event('rentra-profile-changed'));
    return result;
  }, {});
  const preferences = (
    <div className="space-y-5">
      <Field
        label="Email (optional)"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        defaultValue={account.email}
        aria-describedby="email-note"
      />
      <p id="email-note" className="text-meta text-ink-600">
        Your mobile number is used for login.{' '}
        {account.emailVerified
          ? 'Your current email was previously verified; editing it removes that verification.'
          : 'Adding an email is optional.'}
      </p>
      <label className="block text-meta font-medium">
        Preferred contact language
        <select className={control} name="preferredLocale" defaultValue={account.preferredLocale}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="gu">Gujarati</option>
        </select>
      </label>
      <p className="text-meta text-ink-600">The app currently displays English.</p>
      <label className="flex min-h-11 items-start gap-3 text-meta">
        <input
          className="mt-1 size-5 shrink-0 accent-brand-600"
          type="checkbox"
          name="marketingConsent"
          defaultChecked={account.marketingConsent}
        />
        <span>Send me optional Rentra offers and updates. I can turn this off at any time.</span>
      </label>
    </div>
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="expectedVersion" value={account.version} />
      <input type="hidden" name="onboarding" value={String(onboarding)} />
      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        required
        minLength={2}
        maxLength={160}
        defaultValue={account.name}
      />
      {onboarding ? (
        <details className="rounded-lg border border-border p-4">
          <summary className="min-h-11 cursor-pointer font-semibold text-brand-800">
            Optional contact preferences
          </summary>
          <div className="mt-4">{preferences}</div>
        </details>
      ) : (
        preferences
      )}
      <FormStatus state={state} />
      <button className={button} disabled={pending}>
        {pending ? (
          <RentraLoader label="Saving…" />
        ) : onboarding ? (
          'Save and continue'
        ) : (
          <>
            <Check className="size-4" />
            Save changes
          </>
        )}
      </button>
    </form>
  );
}

export function PrivacyForm() {
  const [state, action, pending] = useActionState(submitPrivacyRequest, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block text-meta font-medium">
        Request type
        <select className={control} name="kind">
          <option value="access">Request a copy of my account data</option>
          <option value="deletion">Request account deletion</option>
        </select>
      </label>
      <p className="text-meta text-ink-600">
        This opens a request for the Rentra team to review. It does not immediately delete your
        account or booking records. Status updates appear on this page.
      </p>
      <FormStatus state={state} />
      <button className={button} disabled={pending}>
        {pending ? <RentraLoader label="Recording…" /> : 'Submit privacy request'}
      </button>
    </form>
  );
}

export function PhoneChangeForm() {
  const [open, setOpen] = useState(false);
  const [request, requestAction, requesting] = useActionState(async (previous, form) => {
    const result = await requestPhoneChange(previous, form);
    if (result.challengeId) setOpen(true);
    return result.error ? { ...previous, ...result } : result;
  }, {});
  const [verified, verifyAction, verifying] = useActionState(confirmPhoneChange, {});
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs font-semibold text-ink-500">
        <span className="grid size-7 place-items-center rounded-full bg-brand-700 text-white">
          1
        </span>
        New number
        <ArrowRight className="size-4" />
        <span className="grid size-7 place-items-center rounded-full bg-ink-100">2</span>Verify code
      </div>
      <form action={requestAction} className="space-y-5">
        <Field
          label="New mobile number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          required
          maxLength={18}
        />
        <p className="text-xs text-ink-500">
          Use an Indian mobile number you can receive messages on.
        </p>
        <FormStatus state={request} />
        <button className={button + ' w-full'} disabled={requesting || verifying}>
          {requesting ? (
            <RentraLoader label="Sending…" />
          ) : (
            <>
              <Smartphone className="size-4" />
              Send verification code
            </>
          )}
        </button>
        {request.challengeId && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-11 text-sm font-semibold text-brand-700"
          >
            Enter verification code
          </button>
        )}
      </form>
      <OtpDialog
        open={open}
        onOpenChange={setOpen}
        busy={verifying || requesting}
        description={
          request.development
            ? 'Development mode: enter 123456. No SMS was sent.'
            : `Enter the code sent to +91 ${request.phone ?? ''}. It expires in five minutes.`
        }
      >
        <form key={request.challengeId} action={verifyAction} className="space-y-5">
          <input type="hidden" name="phone" value={request.phone ?? ''} />
          <OtpInput error={Boolean(verified.error)} disabled={verifying} />
          <FormStatus state={verified} />
          <button className={button + ' w-full'} disabled={verifying || requesting}>
            {verifying ? <RentraLoader label="Verifying…" /> : 'Verify & change number'}
          </button>
        </form>
        <form action={requestAction} className="mt-4">
          <input type="hidden" name="phone" value={request.phone ?? ''} />
          <button
            disabled={requesting || verifying}
            className="min-h-11 text-sm font-semibold text-brand-700"
          >
            {requesting ? 'Sending…' : 'Resend code'}
          </button>
          <p className="text-xs text-ink-500">You can request a new code after 60 seconds.</p>
        </form>
        <FormStatus state={request} />
      </OtpDialog>
    </div>
  );
}

export function CustomerLogout() {
  const [state, action, pending] = useActionState(async () => {
    try {
      await logoutCustomer();
      signalSavedChange();
      window.location.replace('/');
      return {};
    } catch {
      return { error: 'Could not sign out. Please try again.' };
    }
  }, {});
  return (
    <form action={action} className="space-y-3">
      <FormStatus state={state} />
      <button
        className="min-h-11 rounded-md border border-border px-5 py-2 font-semibold"
        disabled={pending}
      >
        {pending ? <RentraLoader label="Signing out…" /> : 'Sign out'}
      </button>
    </form>
  );
}
