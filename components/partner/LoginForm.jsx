'use client';
import { useActionState, useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { requestClientOtp, verifyClientOtp } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RentraLoader from '@/components/ui/rentra-loader';
import OtpDialog, { OtpInput } from '@/components/auth/OtpDialog';

export default function LoginForm() {
  const [open, setOpen] = useState(false);
  const [issueState, issueAction, issuing] = useActionState(
    async (previous, form) => {
      const result = await requestClientOtp(previous, form);
      if (result.step === 'code' && !result.error && !result.errors) setOpen(true);
      return result.error || result.errors ? { ...previous, ...result } : result;
    },
    { step: 'email' },
  );
  const [verifyState, verifyAction, verifying] = useActionState(verifyClientOtp, {});
  const email = issueState.email ?? '';
  return (
    <div className="space-y-5">
      <form action={issueAction} className="space-y-4">
        <label htmlFor="email" className="block text-sm font-semibold">
          Email address
        </label>
        <div className="flex h-14 items-center gap-3 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-brand-100">
          <Mail className="size-5 shrink-0 text-ink-500" aria-hidden="true" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={email}
            required
            className="h-12 border-0 px-0 focus-visible:ring-0"
          />
        </div>
        {(issueState.error || issueState.errors?.email) && (
          <p role="alert" className="text-sm text-danger">
            {issueState.errors?.email || issueState.error}
          </p>
        )}
        <Button type="submit" className="h-12 w-full rounded-xl" disabled={issuing || verifying}>
          {issuing ? (
            <RentraLoader label="Sending code…" />
          ) : (
            <>
              Continue <ArrowRight className="size-4" />
            </>
          )}
        </Button>
        {issueState.step === 'code' && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-11 text-sm font-semibold text-brand-700"
          >
            Already have a code? Enter it here
          </button>
        )}
      </form>
      <p className="text-xs text-ink-500">We’ll email you a 6-digit code. No password needed.</p>
      <OtpDialog
        open={open}
        onOpenChange={setOpen}
        busy={verifying || issuing}
        description={`Enter the code sent to ${email}. It expires in 10 minutes.`}
      >
        <form action={verifyAction} className="space-y-5" key={email}>
          <input type="hidden" name="email" value={email} />
          <OtpInput
            error={Boolean(verifyState.error || verifyState.errors?.code)}
            disabled={verifying}
          />
          {(verifyState.error || verifyState.errors?.code) && (
            <p role="alert" className="text-sm text-danger">
              {verifyState.errors?.code || verifyState.error}
            </p>
          )}
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={verifying || issuing}>
            {verifying ? <RentraLoader label="Checking code…" /> : 'Verify & continue'}
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            className="min-h-11 text-ink-600"
            onClick={() => setOpen(false)}
            disabled={verifying || issuing}
          >
            Change email
          </button>
          <form action={issueAction}>
            <input type="hidden" name="email" value={email} />
            <button
              disabled={issuing || verifying}
              className="min-h-11 font-semibold text-brand-700"
            >
              {issuing ? 'Sending…' : 'Resend code'}
            </button>
          </form>
        </div>
        {(issueState.error || issueState.errors?.email) && (
          <p role="alert" className="text-sm text-danger">
            {issueState.errors?.email || issueState.error}
          </p>
        )}
      </OtpDialog>
    </div>
  );
}
