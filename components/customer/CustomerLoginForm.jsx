'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState, useEffect, useState } from 'react';
import { requestCustomerOtp, verifyCustomerOtp } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CustomerLoginForm() {
  const [sent, send, sending] = useActionState(async (previous, formData) => {
    const result = await requestCustomerOtp(null, formData);
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
    <div className="mt-8 space-y-6">
      <form action={send} className="space-y-4">
        <label htmlFor="phone" className="block text-meta font-semibold">
          Mobile number
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          maxLength={18}
          placeholder="98765 43210"
          readOnly={Boolean(sent?.challengeId)}
          defaultValue={sent?.phone ?? ''}
        />
        {sent?.error ? (
          <p role="alert" className="text-meta text-danger">
            {sent.error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={sending || verifying || seconds > 0}
        >
          {sending ? (
            <RentraLoader label="Requesting code…" />
          ) : seconds > 0 ? (
            `Resend in ${seconds}s`
          ) : sent?.challengeId ? (
            'Resend code'
          ) : (
            'Send code'
          )}
        </Button>
      </form>
      {sent?.challengeId ? (
        <form action={verify} className="space-y-4" key={sent.challengeId}>
          <p role="status" className="text-meta text-ink-600">
            {sent.development
              ? 'Development login: enter 123456. No SMS is sent.'
              : `Code requested for +91 ••••••${sent.phone.slice(-4)}. It expires in 5 minutes.`}
          </p>
          <input type="hidden" name="phone" value={sent.phone} />
          <label htmlFor="code" className="block text-meta font-semibold">
            One-time code
          </label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
          />
          {verified?.error ? (
            <p role="alert" className="text-meta text-danger">
              {verified.error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={verifying || sending}>
            {verifying ? <RentraLoader label="Checking code…" /> : 'Log in'}
          </Button>
          {/* Full navigation resets the OTP action state when changing numbers. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/login"
            className="inline-flex min-h-11 items-center text-meta text-brand-700 underline"
          >
            Use a different number
          </a>
        </form>
      ) : null}
      <p className="text-tiny text-ink-500">
        Searching never needs an account. Signing in does not reserve your dates.
      </p>
    </div>
  );
}
