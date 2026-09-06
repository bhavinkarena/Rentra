'use client';

import { useActionState } from 'react';
import { Smartphone, Loader2 } from 'lucide-react';
import { requestPhoneVerification, confirmPhoneVerification } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PhoneVerifyForm({ defaultPhone = '' }) {
  const [issueState, issueAction, issuing] = useActionState(requestPhoneVerification, { step: 'phone' });
  const [confirmState, confirmAction, confirming] = useActionState(confirmPhoneVerification, { step: 'code' });

  const phase = issueState.step === 'code' ? 'code' : 'phone';
  const phone = issueState.phone ?? defaultPhone;

  if (phase === 'phone') {
    return (
      <form action={issueAction} className="space-y-4">
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-meta font-semibold text-ink-700">
            Mobile number
          </label>
          <div className="flex items-stretch gap-2">
            <span className="grid shrink-0 place-items-center rounded-sm border border-input bg-ink-50 px-3 text-meta font-medium text-ink-600">
              +91
            </span>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              placeholder="98765 43210"
              defaultValue={phone}
              aria-invalid={issueState.errors?.phone ? true : undefined}
              required
            />
          </div>
          {issueState.errors?.phone ? (
            <p className="mt-1.5 text-tiny font-medium text-danger">{issueState.errors.phone}</p>
          ) : (
            <p className="mt-1.5 text-tiny text-ink-500">
              Booking requests, the 12-hour accept reminder and payout notices all
              come here on WhatsApp. This is the number guests will call on the day.
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={issuing}>
          {issuing ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
          {issuing ? 'Sending code…' : 'Send code by SMS'}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-brand-50 p-3 text-meta text-brand-800">
        Code sent to <strong className="font-semibold">+91 {phone}</strong>.
      </p>

      <form action={confirmAction} className="space-y-4">
        <input type="hidden" name="phone" value={phone} />
        <div>
          <label htmlFor="pcode" className="mb-1.5 block text-meta font-semibold text-ink-700">
            6-digit code
          </label>
          <Input
            id="pcode"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center font-mono text-h3 tracking-[0.35em]"
            aria-invalid={confirmState.errors?.code ? true : undefined}
            autoFocus
            required
          />
          {confirmState.errors?.code ? (
            <p className="mt-1.5 text-tiny font-medium text-danger">{confirmState.errors.code}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={confirming}>
          {confirming ? <Loader2 className="size-4 animate-spin" /> : null}
          {confirming ? 'Checking…' : 'Verify mobile'}
        </Button>
      </form>

      <form action={issueAction}>
        <input type="hidden" name="phone" value={phone} />
        <button
          type="submit"
          disabled={issuing}
          className="text-meta font-semibold text-brand-700 hover:underline disabled:text-ink-400"
        >
          {issuing ? 'Sending…' : 'Resend code'}
        </button>
      </form>
    </div>
  );
}
