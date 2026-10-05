'use client';
import Loader2 from '@/components/ui/rentra-loader';

import { useActionState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminLogin } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, {});
  const e = state.errors ?? {};
  // Field errors cover credentials; anything else (rate limit, outage) must still be visible.
  const formError = !state.errors && state.error ? state.error : null;

  return (
    <form action={action} className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-bg p-3 text-meta text-danger">
          {formError}
        </p>
      ) : null}
      <Field id="email" label="Email" error={e.email}>
        {/* React resets uncontrolled fields after an action; keep the email across attempts. */}
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email ?? ''}
          key={state.email ?? ''}
          required
        />
      </Field>

      <Field id="password" label="Password" error={e.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {/* Rendered whenever a TOTP secret exists on the account. Always present
          so a password manager can fill it in one pass. */}
      <Field
        id="totp"
        label={
          <>
            Authenticator code
            <span className="ml-1 font-normal text-ink-500">— if enrolled</span>
          </>
        }
        error={e.totp}
      >
        <Input
          id="totp"
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className="w-32 text-center font-mono tracking-[0.3em]"
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 " /> : <ShieldCheck className="size-4" />}
        {pending ? <span className="sr-only">Checking…</span> : 'Sign in'}
      </Button>
    </form>
  );
}
