'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import Loader2 from '@/components/ui/rentra-loader';

import { useActionState, useState, useRef, useTransition } from 'react';
import { Check } from 'lucide-react';
import ValidationSummary from '@/components/portal/ValidationSummary';
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
        <p id={`${id}-help`} className="mt-1.5 text-meta font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-help`} className="mt-1.5 text-meta leading-6 text-ink-600">
          {hint}
        </p>
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
  const form = useRef(null);
  const [, start] = useTransition();
  const [name, setName] = useState(user.name ?? '');
  const [locale, setLocale] = useState(user.preferredLocale ?? 'en');

  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        start(() => action(data));
      }}
      className="space-y-6"
    >
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
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(e.name)}
          aria-describedby="name-help"
          required
          minLength={3}
          maxLength={160}
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
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
          aria-invalid={Boolean(e.preferredLocale)}
          aria-describedby="preferredLocale-help"
          className={inputCls}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी — Hindi</option>
          <option value="gu">ગુજરાતી — Gujarati</option>
        </select>
      </Field>

      <ValidationSummary errors={e} scope={form} />
      {state.error && (
        <p role="alert" className="text-meta text-danger">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" className="min-h-10 px-4" disabled={pending}>
          {pending ? 'Saving...' : 'Save profile'}
        </Button>
        <Saved state={state} pending={pending} />
      </div>
    </form>
  );
}
