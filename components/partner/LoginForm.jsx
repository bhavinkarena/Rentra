'use client';

import { useActionState } from 'react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { requestClientOtp, verifyClientOtp } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Two-step email OTP. No password, ever — nothing to forget, phish or reset.
 *
 * Two `useActionState` hooks rather than one dispatching action: the phase is
 * then derived from the server's own response (`issueState.step`), so a failed
 * code entry cannot bounce the user back to the email step and lose their
 * place.
 */
export default function LoginForm() {
  const [issueState, issueAction, issuing] = useActionState(requestClientOtp, { step: 'email' });
  const [verifyState, verifyAction, verifying] = useActionState(verifyClientOtp, { step: 'code' });

  const phase = issueState.step === 'code' ? 'code' : 'email';
  const email = issueState.email ?? '';

  if (phase === 'email') {
    return (
      <form action={issueAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-meta font-semibold text-ink-700">
            Email address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            defaultValue={email}
            aria-invalid={issueState.errors?.email ? true : undefined}
            aria-describedby={issueState.errors?.email ? 'email-error' : 'email-hint'}
            required
          />
          {issueState.errors?.email ? (
            <p id="email-error" className="mt-1.5 text-tiny font-medium text-danger">
              {issueState.errors.email}
            </p>
          ) : (
            <p id="email-hint" className="mt-1.5 text-tiny text-ink-500">
              We send a 6-digit code. No password needed.
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={issuing}>
          {issuing ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {issuing ? 'Sending code…' : 'Send code'}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md bg-brand-50 p-3 text-meta text-brand-800">
        <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Code sent to <strong className="font-semibold">{email}</strong>. It expires in 10 minutes.
        </p>
      </div>

      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="code" className="mb-1.5 block text-meta font-semibold text-ink-700">
            6-digit code
          </label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center font-mono text-h3 tracking-[0.35em]"
            aria-invalid={verifyState.errors?.code ? true : undefined}
            aria-describedby={verifyState.errors?.code ? 'code-error' : undefined}
            autoFocus
            required
          />
          {verifyState.errors?.code ? (
            <p id="code-error" className="mt-1.5 text-tiny font-medium text-danger">
              {verifyState.errors.code}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={verifying}>
          {verifying ? <Loader2 className="size-4 animate-spin" /> : null}
          {verifying ? 'Checking…' : 'Verify and continue'}
        </Button>
      </form>

      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Resend re-runs the issue action, which enforces the 60-second
            cooldown server-side and returns a friendly message if too soon. */}
        <form action={issueAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={issuing}
            className="text-meta font-semibold text-brand-700 hover:underline disabled:text-ink-400 disabled:no-underline"
          >
            {issuing ? 'Sending…' : 'Resend code'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1 text-meta text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Use a different email
        </button>
      </div>
    </div>
  );
}
