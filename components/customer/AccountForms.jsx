'use client';

import { signalSavedChange } from './SavedPlacesProvider';
import { useActionState, useEffect, useRef } from 'react';
import { updateCustomerProfile, submitPrivacyRequest, requestPhoneChange, confirmPhoneChange, logoutCustomer } from '@/lib/customer/actions';

const control='mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-body';
const button='min-h-11 rounded-md bg-brand-600 px-5 py-2 font-semibold text-white disabled:opacity-50';
export function FormStatus({ state }) {
  const message=useRef(null);
  useEffect(()=>{ if(state.error) message.current?.focus(); },[state]);
  return state.error ? <p ref={message} role="alert" tabIndex={-1} className="rounded-md border border-danger p-3 text-meta">{state.error}</p>
    : state.ok ? <p role="status" className="rounded-md bg-brand-50 p-3 text-meta text-brand-800 break-words">{state.ok}</p> : null;
}
function Field({label,...props}) { return <label className="block text-meta font-medium">{label}<input className={control} {...props}/></label>; }

export function ProfileForm({ account, onboarding=false }) {
  const [state,action,pending]=useActionState(updateCustomerProfile,{});
  const preferences = <div className="space-y-5">
    <Field label="Email (optional)" name="email" type="email" autoComplete="email" maxLength={254} defaultValue={account.email} aria-describedby="email-note"/>
    <p id="email-note" className="text-meta text-ink-600">Email is optional and is not used for login or message delivery. {account.emailVerified ? 'Your current email was previously verified; editing it removes that verification.' : 'Your email is unverified.'}</p>
    <label className="block text-meta font-medium">Preferred contact language<select className={control} name="preferredLocale" defaultValue={account.preferredLocale}><option value="en">English</option><option value="hi">Hindi</option><option value="gu">Gujarati</option></select></label>
    <p className="text-meta text-ink-600">This saves your preference. The app currently displays English.</p>
    <label className="flex min-h-11 items-start gap-3 text-meta"><input className="mt-1 size-5 shrink-0 accent-brand-600" type="checkbox" name="marketingConsent" defaultChecked={account.marketingConsent}/><span>Send me optional Rentra offers and updates. I can turn this off at any time.</span></label>
  </div>;
  return <form action={action} className="space-y-5">
    <input type="hidden" name="expectedVersion" value={account.version}/><input type="hidden" name="onboarding" value={String(onboarding)}/>
    <Field label="Your name" name="name" autoComplete="name" required minLength={2} maxLength={160} defaultValue={account.name}/>
    {onboarding ? <details className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer font-semibold text-brand-800">Optional contact preferences</summary><div className="mt-4">{preferences}</div></details> : preferences}
    <FormStatus state={state}/><button className={button} disabled={pending}>{pending?'Saving…':onboarding?'Save and continue':'Save profile'}</button>
  </form>;
}

export function PrivacyForm() {
  const [state,action,pending]=useActionState(submitPrivacyRequest,{});
  return <form action={action} className="space-y-4">
    <label className="block text-meta font-medium">Request type<select className={control} name="kind"><option value="access">Request a copy of my account data</option><option value="deletion">Request account deletion</option></select></label>
    <p className="text-meta text-ink-600">This opens a request for the Rentra team to review. It does not immediately delete your account or booking records. Status updates appear on this page.</p>
    <FormStatus state={state}/><button className={button} disabled={pending}>{pending?'Recording…':'Submit privacy request'}</button>
  </form>;
}

export function PhoneChangeForm() {
  const [request,requestAction,requesting]=useActionState(requestPhoneChange,{});
  const [verified,verifyAction,verifying]=useActionState(confirmPhoneChange,{});
  return <div className="space-y-6">
    <form action={requestAction} className="space-y-4"><Field label="New mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={16}/><FormStatus state={request}/><button className={button} disabled={requesting}>{requesting?'Sending…':'Send verification code'}</button></form>
    {request.challengeId ? <form key={request.challengeId} action={verifyAction} className="space-y-4">
      <p className="text-meta">Code requested for +91 {request.phone}. It expires in five minutes. Resend after 60 seconds.</p>
      {request.development ? <p role="status" className="rounded-md bg-brand-50 p-3 text-meta">Development mode: use 123456. No SMS was sent.</p>:null}
      <input type="hidden" name="phone" value={request.phone}/><Field label="Verification code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/>
      <FormStatus state={verified}/><button className={button} disabled={verifying}>{verifying?'Verifying…':'Verify and change number'}</button>
    </form>:null}
  </div>;
}

export function CustomerLogout() {
  const [state,action,pending]=useActionState(async()=>{
    try { await logoutCustomer(); signalSavedChange(); window.location.replace('/'); return {}; }
    catch { return {error:'Could not sign out. Please try again.'}; }
  },{});
  return <form action={action} className="space-y-3"><FormStatus state={state}/><button className="min-h-11 rounded-md border border-border px-5 py-2 font-semibold" disabled={pending}>{pending?'Signing out…':'Sign out'}</button></form>;
}
