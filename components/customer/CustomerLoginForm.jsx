'use client';
import { useActionState, useEffect, useState } from 'react';
import { ArrowRight, Smartphone } from 'lucide-react';
import { requestCustomerOtp, verifyCustomerOtp } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RentraLoader from '@/components/ui/rentra-loader';
import OtpDialog, { OtpInput } from '@/components/auth/OtpDialog';

export default function CustomerLoginForm() {
  const [open, setOpen] = useState(false);
  const [sent, send, sending] = useActionState(async (previous, formData) => {
    const result = await requestCustomerOtp(null, formData);
    if (!result.error) setOpen(true);
    return result.error ? { ...previous, error: result.error } : result;
  }, null);
  const [verified, verify, verifying] = useActionState(verifyCustomerOtp, null);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!sent?.challengeId) return;
    const until = Date.now() + sent.resendAfter * 1000;
    const tick = () => setSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [sent?.challengeId, sent?.resendAfter]);
  return (
    <div className="mt-8 space-y-5">
      <form action={send} className="space-y-4">
        <label htmlFor="phone" className="block text-sm font-semibold">
          Mobile number
        </label>
        <div className="flex h-14 items-center rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-brand-100">
          <Smartphone className="mr-2 size-5 text-ink-500" aria-hidden="true" />
          <span className="mr-3 border-r border-border pr-3 text-sm">+91</span>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            maxLength={18}
            placeholder="98765 43210"
            className="h-12 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        {sent?.error && (
          <p role="alert" className="text-sm text-danger">
            {sent.error}
          </p>
        )}
        <Button
          type="submit"
          className="h-12 w-full rounded-xl"
          disabled={sending || verifying || seconds > 0}
        >
          {sending ? (
            <RentraLoader label="Sending code…" />
          ) : seconds > 0 ? (
            `Send again in ${seconds}s`
          ) : (
            <>
              Continue <ArrowRight className="size-4" />
            </>
          )}
        </Button>
        {sent?.challengeId && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-11 text-sm font-semibold text-brand-700"
          >
            Already have a code? Enter it here
          </button>
        )}
      </form>
      <p className="text-xs leading-relaxed text-ink-500">
        We’ll send a 6-digit code to verify your number. No password to remember.
      </p>
      <OtpDialog
        open={open}
        onOpenChange={setOpen}
        busy={sending || verifying}
        description={
          sent?.development
            ? 'Development login: enter 123456. No SMS is sent.'
            : `Enter the code sent to +91 ${sent?.phone ?? ''}. It expires in 5 minutes.`
        }
      >
        <form action={verify} key={sent?.challengeId} className="space-y-5">
          <input type="hidden" name="phone" value={sent?.phone ?? ''} />
          <OtpInput error={Boolean(verified?.error)} disabled={verifying} />
          {verified?.error && (
            <p role="alert" className="text-sm text-danger">
              {verified.error}
            </p>
          )}
          <Button type="submit" disabled={verifying || sending} className="h-12 w-full rounded-xl">
            {verifying ? <RentraLoader label="Checking code…" /> : 'Verify & log in'}
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="min-h-11 text-ink-600"
            onClick={() => setOpen(false)}
            disabled={verifying || sending}
          >
            Change number
          </button>
          <form action={send}>
            <input type="hidden" name="phone" value={sent?.phone ?? ''} />
            <button
              disabled={sending || verifying || seconds > 0}
              className="min-h-11 font-semibold text-brand-700 disabled:text-ink-400"
            >
              {seconds > 0 ? `Resend in ${seconds}s` : sending ? 'Sending…' : 'Resend code'}
            </button>
          </form>
        </div>
        {sent?.error && (
          <p role="alert" className="text-sm text-danger">
            {sent.error}
          </p>
        )}
      </OtpDialog>
    </div>
  );
}
