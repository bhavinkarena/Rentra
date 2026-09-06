'use client';

import { useActionState, useState } from 'react';
import { Loader2, Landmark, Smartphone } from 'lucide-react';
import { saveDetails, savePayout, saveConsent } from '@/lib/auth/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/* --------------------------- shared field bits --------------------------- */

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

function Submit({ pending, children, icon: Icon }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {pending ? 'Saving…' : children}
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
    <form action={action} className="space-y-5">
      <Field
        id="legalName"
        label="Full name, as printed on your ID"
        hint="This is name-matched against your ownership document later, so it has to match exactly."
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
          className="w-full rounded-sm border border-input bg-card px-3.5 py-3 text-meta text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
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
            className="w-full rounded-sm border border-input bg-card px-3.5 py-3 text-meta text-ink-900 focus:border-brand-600 focus:outline-none"
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
            name="clientType" value="owner"
            checked={clientType === 'owner'} onChange={() => setClientType('owner')}
            title="Yes, I own it"
            body="Your ownership document must be in your own name."
          />
          <Radio
            name="clientType" value="authorised_agent"
            checked={clientType === 'authorised_agent'} onChange={() => setClientType('authorised_agent')}
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
          <Field id="ownerRelationship" label="Your relationship to them" error={e.ownerRelationship}>
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

      <Submit pending={pending}>Save and continue</Submit>
    </form>
  );
}

/* -------------------------------- payout -------------------------------- */

export function PayoutForm({ application }) {
  const [state, action, pending] = useActionState(savePayout, {});
  const [method, setMethod] = useState(application?.payoutUpiId ? 'upi' : 'upi');
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-meta font-semibold text-ink-700">How should we pay you?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Radio
            name="method" value="upi"
            checked={method === 'upi'} onChange={() => setMethod('upi')}
            title="UPI" body="Fastest — usually same day"
          />
          <Radio
            name="method" value="bank"
            checked={method === 'bank'} onChange={() => setMethod('bank')}
            title="Bank account" body="Settles on T+1 or T+2"
          />
        </div>
      </fieldset>

      {method === 'upi' ? (
        <Field id="upiId" label="UPI ID" hint="Looks like yourname@bank." error={e.upiId}>
          <Input id="upiId" name="upiId" placeholder="yourname@upi" defaultValue={application?.payoutUpiId ?? ''} />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="accountNumber" label="Account number" error={e.accountNumber}>
            <Input id="accountNumber" name="accountNumber" inputMode="numeric" className="font-mono" />
          </Field>
          <Field id="ifsc" label="IFSC" hint="Like SBIN0001234." error={e.ifsc}>
            <Input
              id="ifsc"
              name="ifsc"
              maxLength={11}
              placeholder="SBIN0001234"
              defaultValue={application?.payoutIfsc ?? ''}
              className="font-mono uppercase"
            />
          </Field>
        </div>
      )}

      <Field
        id="holderName"
        label="Account holder name"
        hint="Must match the name on your ID. We cannot pay a third party."
        error={e.holderName}
      >
        <Input id="holderName" name="holderName" defaultValue={application?.payoutHolderName ?? ''} required />
      </Field>

      {application?.payoutNameMatch === false ? (
        <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-tiny text-danger">
          The holder name does not match the name on your ID. We cannot approve a payout
          destination in someone else&rsquo;s name — please correct it, or tell us at review.
        </p>
      ) : null}

      <Submit pending={pending} icon={method === 'upi' ? Smartphone : Landmark}>
        Save payout details
      </Submit>
    </form>
  );
}

/* -------------------------------- consent -------------------------------- */

export function ConsentForm() {
  const [state, action, pending] = useActionState(saveConsent, {});
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-5">
      <label className="flex cursor-pointer gap-3 rounded-md border border-input p-3 hover:bg-ink-50">
        <input type="checkbox" name="acceptTerms" className="mt-1 size-4 shrink-0 accent-brand-600" />
        <span className="text-meta text-ink-800">
          I accept Rentra&rsquo;s terms of service and privacy policy. I understand Rentra is an
          intermediary that facilitates bookings, and is not the owner or operator of my property.
        </span>
      </label>
      {e.acceptTerms ? <p className="text-tiny font-medium text-danger">{e.acceptTerms}</p> : null}

      <label className="flex cursor-pointer gap-3 rounded-md border border-input p-3 hover:bg-ink-50">
        <input type="checkbox" name="declareEntitled" className="mt-1 size-4 shrink-0 accent-brand-600" />
        <span className="text-meta text-ink-800">
          I confirm I am legally entitled to let the properties I will list, and that I will hold
          any local permissions required for events held on them.
        </span>
      </label>
      {e.declareEntitled ? <p className="text-tiny font-medium text-danger">{e.declareEntitled}</p> : null}

      <p className="text-tiny text-ink-500">
        We record the time and IP address of this consent, as evidence in any dispute.
      </p>

      <Submit pending={pending}>Agree and continue</Submit>
    </form>
  );
}
