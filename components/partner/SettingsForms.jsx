'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import Loader2 from '@/components/ui/rentra-loader';

import { useActionState, useState } from 'react';
import { Check, Landmark, Smartphone } from 'lucide-react';
import { saveAccountSettings } from '@/lib/actions/partner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const inputCls = `${sharedFieldClass} `;

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
        <Loader2 className="size-4 " aria-hidden="true" />
        <span className="sr-only">Saving…</span>
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

export function AccountForm({ user, nameLocked = false }) {
  const [state, action, pending] = useActionState(saveAccountSettings, {});
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      <Field
        id="name"
        label="Display name"
        error={e.name}
        hint={
          nameLocked
            ? 'Contact support to change your name after submission.'
            : 'Shown to guests on your properties.'
        }
      >
        <Input
          id="name"
          name="name"
          defaultValue={user.name ?? ''}
          readOnly={nameLocked}
          className="h-11"
        />
      </Field>

      <Field
        id="preferredLocale"
        label="Language"
        error={e.preferredLocale}
        hint="The language we write to you in. Guests always see listings in English."
      >
        <select
          id="preferredLocale"
          name="preferredLocale"
          defaultValue={user.preferredLocale ?? 'en'}
          className={inputCls}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी — Hindi</option>
          <option value="gu">ગુજરાતી — Gujarati</option>
        </select>
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" className="min-h-10 px-4" disabled={pending}>
          Save
        </Button>
        <Saved state={state} pending={pending} />
      </div>
    </form>
  );
}
