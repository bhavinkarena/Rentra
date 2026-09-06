'use client';

import { useActionState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { adminLogin } from '@/lib/auth/admin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, {});
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-meta font-semibold text-ink-700">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-meta font-semibold text-ink-700">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={e.password ? true : undefined}
          required
        />
        {e.password ? (
          <p className="mt-1.5 text-tiny font-medium text-danger">{e.password}</p>
        ) : null}
      </div>

      {/* Rendered whenever a TOTP secret exists on the account. Always present
          so a password manager can fill it in one pass. */}
      <div>
        <label htmlFor="totp" className="mb-1.5 block text-meta font-semibold text-ink-700">
          Authenticator code
          <span className="ml-1 font-normal text-ink-500">— if enrolled</span>
        </label>
        <Input
          id="totp"
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className="w-32 text-center font-mono tracking-[0.3em]"
          aria-invalid={e.totp ? true : undefined}
        />
        {e.totp ? (
          <p className="mt-1.5 text-tiny font-medium text-danger">{e.totp}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        {pending ? 'Checking…' : 'Sign in'}
      </Button>
    </form>
  );
}
