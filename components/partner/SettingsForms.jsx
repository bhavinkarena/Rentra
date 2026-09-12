'use client';

import { useActionState, useState } from 'react';
import { Check, Landmark, Loader2, Smartphone } from 'lucide-react';
import { saveAccountSettings, savePayoutDestination } from '@/lib/auth/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const inputCls = 'w-full rounded-sm border border-input bg-card px-3.5 py-3 text-meta '
  + 'text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none';

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-meta font-semibold text-ink-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-tiny font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-tiny text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

function Saved({ state, pending }) {
  if (pending) {
    return (
      <p className="inline-flex items-center gap-1.5 text-meta text-ink-500">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Saving…
      </p>
    );
  }
  if (!state?.ok) return null;
  return (
    <p className="inline-flex items-center gap-1.5 text-meta font-semibold text-brand-700">
      <Check className="size-4" aria-hidden="true" /> Saved
    </p>
  );
}

/* -------------------------------- account -------------------------------- */

export function AccountForm({ user }) {
  const [state, action, pending] = useActionState(saveAccountSettings, {});
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      <Field
        id="name" label="Your name" error={e.name}
        hint="Shown to guests on your listings, alongside your verified badge."
      >
        <Input id="name" name="name" defaultValue={user.name ?? ''} className="h-11" />
      </Field>

      <Field
        id="preferredLocale" label="Language" error={e.preferredLocale}
        hint="The language we write to you in. Guests always see listings in English."
      >
        <select
          id="preferredLocale" name="preferredLocale"
          defaultValue={user.preferredLocale ?? 'en'} className={inputCls}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी — Hindi</option>
          <option value="gu">ગુજરાતી — Gujarati</option>
        </select>
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" className="min-h-10 px-4" disabled={pending}>Save</Button>
        <Saved state={state} pending={pending} />
      </div>
    </form>
  );
}

/* -------------------------------- payout -------------------------------- */

export function PayoutDestinationForm({ user, application }) {
  const [state, action, pending] = useActionState(savePayoutDestination, {});
  const [method, setMethod] = useState(application?.payoutAccountRef ? 'bank' : 'upi');
  const e = state.errors ?? {};

  // The freshly-computed verdict wins over the stored one the moment a save
  // returns, so the warning tracks what was just typed rather than lagging it.
  const nameMatch = state.ok ? state.nameMatch : application?.payoutNameMatch;

  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-meta font-semibold text-ink-700">How should we pay you?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { v: 'upi', title: 'UPI', body: 'Fastest — usually same day', Icon: Smartphone },
            { v: 'bank', title: 'Bank account', body: 'Settles on T+1 or T+2', Icon: Landmark },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                method === o.v ? 'border-brand-600 bg-brand-50' : 'border-input hover:bg-ink-50'
              }`}
            >
              <input
                type="radio" name="method" value={o.v}
                checked={method === o.v} onChange={() => setMethod(o.v)}
                className="mt-1 size-4 shrink-0 accent-brand-600"
              />
              <span>
                <span className="block text-meta font-semibold text-ink-900">{o.title}</span>
                <span className="block text-tiny text-ink-500">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {method === 'upi' ? (
        <Field id="upiId" label="UPI ID" hint="Looks like yourname@bank." error={e.upiId}>
          <Input
            id="upiId" name="upiId" placeholder="yourname@upi"
            defaultValue={application?.payoutUpiId ?? ''} className="h-11"
          />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="accountNumber" label="Account number" error={e.accountNumber}
            hint={application?.payoutAccountRef
              ? `Currently ${application.payoutAccountRef}. Type the full number to change it.`
              : null}
          >
            <Input id="accountNumber" name="accountNumber" inputMode="numeric" className="h-11 font-mono" />
          </Field>
          <Field id="ifsc" label="IFSC" hint="Like SBIN0001234." error={e.ifsc}>
            <Input
              id="ifsc" name="ifsc" maxLength={11} placeholder="SBIN0001234"
              defaultValue={application?.payoutIfsc ?? ''} className="h-11 font-mono uppercase"
            />
          </Field>
        </div>
      )}

      <Field
        id="holderName" label="Account holder name" error={e.holderName}
        hint="Must match the name on your ID. We cannot pay a third party."
      >
        <Input
          id="holderName" name="holderName"
          defaultValue={application?.payoutHolderName ?? user.name ?? ''} className="h-11" required
        />
      </Field>

      {nameMatch === false ? (
        <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-tiny text-danger">
          <strong>This name does not match your ID.</strong> We have saved it, but a payout to a
          destination in someone else&rsquo;s name is held until a reviewer clears it. If the
          account is genuinely in another name — a family member, a firm — tell us and we will
          record why.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" className="min-h-10 px-4" disabled={pending}>Save payout details</Button>
        <Saved state={state} pending={pending} />
      </div>
    </form>
  );
}
