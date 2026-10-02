'use client';
import { runIdentityAction } from '@/lib/auth/identity-signal';
import { useActionState, useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { requestClientOtp, verifyClientOtp } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RentraLoader from '@/components/ui/rentra-loader';
import OtpDialog, { OtpInput } from '@/components/auth/OtpDialog';

export default function LoginForm() {
  const [channel, setChannel] = useState('email');
  const [open, setOpen] = useState(false);
  const [issueState, issueAction, issuing] = useActionState(
    async (previous, form) => {
      const result = await requestClientOtp(previous, form);
      if (result.step === 'code' && !result.error && !result.errors) setOpen(true);
      return result.error || result.errors ? { ...previous, ...result } : result;
    },
    { step: 'email' },
  );
  const [verifyState, verifyAction, verifying] = useActionState(
    (state, form) => runIdentityAction(verifyClientOtp, state, form),
    {},
  );
  const email = issueState.channel === channel ? (issueState.email ?? '') : '';
  const mobile = channel === 'sms';
  return (
    <div className="space-y-5">
      <fieldset className="flex gap-4">
        <legend className="sr-only">Sign-in method</legend>
        {[
          ['email', 'Email'],
          ['sms', 'Mobile'],
        ].map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-meta font-semibold">
            <input
              type="radio"
              name="loginMethod"
              value={value}
              checked={channel === value}
              onChange={() => {
                setChannel(value);
                setOpen(false);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <form
        onReset={(event) => event.preventDefault()}
        action={issueAction}
        className="space-y-4"
        key={channel}
      >
        <input type="hidden" name="channel" value={channel} />
        <label htmlFor="email" className="block text-sm font-semibold">
          {mobile ? 'Mobile number' : 'Email address'}
        </label>
        <div
          data-field-shell
          className="flex h-14 items-center gap-3 rounded-xl border border-input bg-card px-4"
        >
          <Mail className="size-5 shrink-0 text-ink-500" aria-hidden="true" />
          <Input
            id="email"
            name={mobile ? 'phone' : 'email'}
            type={mobile ? 'tel' : 'email'}
            autoComplete={mobile ? 'tel' : 'email'}
            placeholder={mobile ? '98765 43210' : 'you@example.com'}
            defaultValue={email}
            required
            className="h-12 border-0 px-0"
          />
        </div>
        {(issueState.error || issueState.errors?.email || issueState.errors?.phone) && (
          <p role="alert" className="text-sm text-danger">
            {issueState.errors?.email || issueState.errors?.phone || issueState.error}
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
        <form
          onReset={(event) => event.preventDefault()}
          action={verifyAction}
          className="space-y-5"
          key={email}
        >
          <input type="hidden" name="channel" value={channel} />
          <input type="hidden" name={mobile ? 'phone' : 'email'} value={email} />
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
            {mobile ? 'Change mobile' : 'Change email'}
          </button>
          <form onReset={(event) => event.preventDefault()} action={issueAction}>
            <input type="hidden" name="channel" value={channel} />
            <input type="hidden" name={mobile ? 'phone' : 'email'} value={email} />
            <button
              disabled={issuing || verifying}
              className="min-h-11 font-semibold text-brand-700"
            >
              {issuing ? 'Sending…' : 'Send a new code'}
            </button>
          </form>
        </div>
        {(issueState.error || issueState.errors?.email || issueState.errors?.phone) && (
          <p role="alert" className="text-sm text-danger">
            {issueState.errors?.email || issueState.errors?.phone || issueState.error}
          </p>
        )}
      </OtpDialog>
    </div>
  );
}
