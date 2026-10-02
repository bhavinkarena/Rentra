'use client';
import Link from '@/components/navigation/NavigationLink';
import { Field } from '@/components/ui/field';
import Loader2 from '@/components/ui/rentra-loader';

import { useActionState, useState, useRef } from 'react';
import FormError from '@/components/portal/FormError';
import { Landmark, Smartphone } from 'lucide-react';
import { saveDetails, savePayout, saveConsent } from '@/lib/actions/partner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Keep entered values when a Server Action returns an inline error. Navigation clears saved forms.
/* --------------------------- shared field bits --------------------------- */

function Submit({ pending, children, icon: Icon }) {
  return (
    <Button
      type="submit"
      size="lg"
      className="sticky bottom-4 z-10 w-full shadow-sm"
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 " /> : Icon ? <Icon className="size-4" /> : null}
      {pending ? <span className="sr-only">Saving…</span> : children}
    </Button>
  );
}

function Radio({ name, value, checked, onChange, title, body }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
        checked ? 'border-brand-600 bg-brand-50' : 'border-input hover:bg-ink-50'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 shrink-0 accent-brand-600"
      />
      <span>
        <span className="block text-meta font-semibold text-ink-900">{title}</span>
        {body ? <span className="block text-tiny text-ink-500">{body}</span> : null}
      </span>
    </label>
  );
}

/* -------------------------------- details -------------------------------- */

export function DetailsForm({ user, application }) {
  const [state, action, pending] = useActionState(saveDetails, {});
  const [clientType, setClientType] = useState(user.clientType ?? 'owner');
  const e = state.errors ?? {};

  return (
    <form onReset={(event) => event.preventDefault()} action={action} className="space-y-5">
      <Field
        id="legalName"
        label="Full name, as printed on your ID"
        hint="Use the same name as your ID and ownership document."
        error={e.legalName}
      >
        <Input id="legalName" name="legalName" defaultValue={user.name ?? ''} required />
      </Field>

      <Field id="residentialAddress" label="Residential address" error={e.residentialAddress}>
        <textarea
          id="residentialAddress"
          name="residentialAddress"
          rows={3}
          defaultValue={application?.residentialAddress ?? ''}
          className="w-full rounded-md border border-input bg-card px-3.5 py-3 text-base md:text-sm text-ink-900 placeholder:text-muted-foreground focus:border-brand-600"
          placeholder="House / street, area, city"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pincode" label="Pincode" error={e.pincode}>
          <Input
            id="pincode"
            name="pincode"
            inputMode="numeric"
            maxLength={6}
            defaultValue={application?.pincode ?? ''}
            required
          />
        </Field>
        <Field id="preferredLocale" label="Language you prefer" error={e.preferredLocale}>
          <select
            id="preferredLocale"
            name="preferredLocale"
            defaultValue={user.preferredLocale ?? 'en'}
            className="w-full rounded-md border border-input bg-card px-3.5 py-3 text-base md:text-sm text-ink-900 focus:border-brand-600"
          >
            <option value="gu">ગુજરાતી</option>
            <option value="hi">हिन्दी</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-meta font-semibold text-ink-700">
          Are you the owner of the property?
        </legend>
        <div className="space-y-2">
          <Radio
            name="clientType"
            value="owner"
            checked={clientType === 'owner'}
            onChange={() => setClientType('owner')}
            title="Yes, I own it"
            body="Your ownership document must be in your own name."
          />
          <Radio
            name="clientType"
            value="authorised_agent"
            checked={clientType === 'authorised_agent'}
            onChange={() => setClientType('authorised_agent')}
            title="No, I manage it for the owner"
            body="Allowed — your listings will publicly say “Authorised manager”, never “Owner”."
          />
        </div>
      </fieldset>

      {clientType === 'authorised_agent' ? (
        <div className="grid gap-4 rounded-md border border-border bg-ink-50 p-4 sm:grid-cols-2">
          <Field id="ownerName" label="Owner's full name" error={e.ownerName}>
            <Input id="ownerName" name="ownerName" defaultValue={application?.ownerName ?? ''} />
          </Field>
          <Field
            id="ownerRelationship"
            label="Your relationship to them"
            error={e.ownerRelationship}
          >
            <Input
              id="ownerRelationship"
              name="ownerRelationship"
              placeholder="Father, brother, employer…"
              defaultValue={application?.ownerRelationship ?? ''}
            />
          </Field>
        </div>
      ) : null}

      <Field
        id="intendedListingCount"
        label="How many properties do you plan to list?"
        hint="Just so we know what to expect. You can change this any time."
        error={e.intendedListingCount}
      >
        <Input
          id="intendedListingCount"
          name="intendedListingCount"
          inputMode="numeric"
          defaultValue={application?.intendedListingCount ?? ''}
          placeholder="1"
        />
      </Field>

      <FormError state={state} />
      <Submit pending={pending}>Save and continue</Submit>
    </form>
  );
}

/* -------------------------------- payout -------------------------------- */

export function PayoutForm({ application }) {
  const [state, action, pending] = useActionState(savePayout, {});
  const [bankHint, setBankHint] = useState('');
  const lookupRef = useRef(0);
  async function lookupIfsc(event) {
    const code = event.target.value.trim().toUpperCase();
    const request = ++lookupRef.current;
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      setBankHint('');
      return;
    }
    setBankHint('Looking up bank and branch…');
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${code}`, {
        signal: AbortSignal.timeout(5000),
      });
      const bank = response.ok ? await response.json() : null;
      if (request === lookupRef.current)
        setBankHint(
          bank?.BANK && bank?.BRANCH
            ? `${bank.BANK} · ${bank.BRANCH}`
            : 'Bank could not be found. Check the IFSC on your bank statement.',
        );
    } catch {
      if (request === lookupRef.current)
        setBankHint(
          'Bank lookup is unavailable. You can still save the IFSC from your bank statement.',
        );
    }
  }
  const [method, setMethod] = useState(application?.payoutAccountRef ? 'bank' : 'upi');
  const e = state.errors ?? {};

  return (
    <form onReset={(event) => event.preventDefault()} action={action} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-meta font-semibold text-ink-700">
          How should we pay you?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Radio
            name="method"
            value="upi"
            checked={method === 'upi'}
            onChange={() => setMethod('upi')}
            title="UPI"
            body="Your UPI ID, e.g. name@okhdfc"
          />
          <Radio
            name="method"
            value="bank"
            checked={method === 'bank'}
            onChange={() => setMethod('bank')}
            title="Bank account"
            body="Account number and IFSC"
          />
        </div>
      </fieldset>

      {method === 'upi' ? (
        <Field id="upiId" label="UPI ID" hint="Looks like yourname@bank." error={e.upiId}>
          <Input
            id="upiId"
            name="upiId"
            placeholder="yourname@upi"
            defaultValue={application?.payoutUpiId ?? ''}
          />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="accountNumber" label="Account number" error={e.accountNumber}>
            <Input
              id="accountNumber"
              name="accountNumber"
              required
              autoComplete="off"
              inputMode="numeric"
              className="font-mono"
            />
          </Field>
          <Field
            id="confirmAccountNumber"
            label="Confirm account number"
            hint="Enter it again to avoid a payout mistake."
            error={e.confirmAccountNumber}
          >
            <Input
              id="confirmAccountNumber"
              name="confirmAccountNumber"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </Field>
          <Field id="ifsc" label="IFSC" hint="Like SBIN0001234." error={e.ifsc}>
            <Input
              id="ifsc"
              name="ifsc"
              onBlur={lookupIfsc}
              onChange={() => {
                lookupRef.current++;
                setBankHint('');
              }}
              maxLength={11}
              placeholder="SBIN0001234"
              defaultValue={application?.payoutIfsc ?? ''}
              className="font-mono uppercase"
            />
          </Field>
          <p role="status" className="text-tiny text-ink-600 sm:col-span-2">
            {bankHint}
          </p>
        </div>
      )}

      <Field
        id="holderName"
        label="Account holder name"
        hint="Use the name on your bank account. It should match your ID."
        error={e.holderName}
      >
        <Input
          id="holderName"
          name="holderName"
          defaultValue={application?.payoutHolderName ?? ''}
          required
        />
      </Field>

      {application?.payoutNameMatch === false ? (
        <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-tiny text-danger">
          The holder name differs from the name on your ID. Rentra reviews this; payouts need a
          destination in your name — correct it, or explain at review.
        </p>
      ) : null}

      <FormError state={state} />
      <Submit pending={pending} icon={method === 'upi' ? Smartphone : Landmark}>
        Save and continue
      </Submit>
    </form>
  );
}

/* -------------------------------- consent -------------------------------- */

export function ConsentForm({ application }) {
  const [state, action, pending] = useActionState(saveConsent, {});
  const e = state.errors ?? {};

  return (
    <form onReset={(event) => event.preventDefault()} action={action} className="space-y-5">
      {application?.consentAt ? (
        <p className="text-meta text-ink-600">
          Previously agreed on{' '}
          {new Date(application.consentAt).toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
          })}
          .
        </p>
      ) : null}
      <p className="text-meta">
        Read our{' '}
        <Link href="/policies/owner-terms" className="text-brand-700 underline">
          Owner terms
        </Link>
        ,{' '}
        <Link href="/policies/privacy" className="text-brand-700 underline">
          Privacy policy
        </Link>{' '}
        and{' '}
        <Link href="/policies/cancellation" className="text-brand-700 underline">
          Cancellation policy
        </Link>
        .
      </p>
      <label className="flex cursor-pointer gap-3 rounded-md border border-input p-3 hover:bg-ink-50">
        <input
          type="checkbox"
          name="acceptTerms"
          className="mt-1 size-4 shrink-0 accent-brand-600"
        />
        <span className="text-meta text-ink-800">
          I accept Rentra&rsquo;s terms of service and privacy policy. I understand Rentra is an
          intermediary that facilitates bookings, and is not the owner or operator of my property.
        </span>
      </label>
      {e.acceptTerms ? <p className="text-tiny font-medium text-danger">{e.acceptTerms}</p> : null}

      <label className="flex cursor-pointer gap-3 rounded-md border border-input p-3 hover:bg-ink-50">
        <input
          type="checkbox"
          name="declareEntitled"
          className="mt-1 size-4 shrink-0 accent-brand-600"
        />
        <span className="text-meta text-ink-800">
          I confirm I am legally entitled to let the properties I will list, and that I will hold
          any local permissions required for events held on them.
        </span>
      </label>
      {e.declareEntitled ? (
        <p className="text-tiny font-medium text-danger">{e.declareEntitled}</p>
      ) : null}

      <p className="text-tiny text-ink-500">
        We record the time and IP address of this consent, as evidence in any dispute.
      </p>

      <FormError state={state} />
      <Submit pending={pending}>Agree and continue</Submit>
    </form>
  );
}
