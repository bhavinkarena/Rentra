'use client';
import { useActionState, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ChevronDown, Monitor } from 'lucide-react';
import {
  requestOwnerContact,
  confirmOwnerContact,
  signOutOtherOwnerDevices,
} from '@/lib/actions/partner';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import ValidationSummary from '@/components/portal/ValidationSummary';
function Result({ state, scope }) {
  return (
    <>
      <ValidationSummary errors={state.errors} scope={scope} />
      {state.error && (
        <p role="alert" className="text-meta text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-meta text-success">
          {state.message}
        </p>
      )}
    </>
  );
}
function ContactForm({ channel, current }) {
  const [issued, issue, sending] = useActionState(requestOwnerContact, {}),
    [saved, verify, verifying] = useActionState(async (previous, form) => {
      const result = await confirmOwnerContact(previous, form);
      if (result.message) toast.success(result.message);
      return result;
    }, {});
  const [identifier, setIdentifier] = useState(''),
    [code, setCode] = useState('');
  const [, start] = useTransition(),
    issueForm = useRef(null),
    verifyForm = useRef(null);
  const email = channel === 'email',
    title = email ? 'Email address' : 'Mobile number';
  return (
    <details className="group p-5 sm:p-6">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-meta font-semibold">{title}</span>
          <span className="mt-2 block wrap-break-word text-meta text-ink-600">
            {current || 'Not added'}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-meta font-semibold text-brand-800">
          Change
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </span>
      </summary>
      <div className="mt-6 border-t border-border pt-5">
        <form
          ref={issueForm}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setCode('');
            start(() => issue(data));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="channel" value={channel} />
          <label className="block text-meta font-semibold">
            {email ? 'New email address' : 'New mobile number (+91)'}
            <input
              className={`${fieldClass} mt-2 min-h-12`}
              type={email ? 'email' : 'tel'}
              name="identifier"
              required
              autoComplete={email ? 'email' : 'tel'}
              placeholder={email ? undefined : '+919876543210'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={sending || verifying}
            />
          </label>
          <button className={buttonVariants()} disabled={sending || verifying}>
            {sending
              ? 'Sending...'
              : issued.challengeId
                ? 'Send another code'
                : 'Send verification code'}
          </button>
          <Result state={issued} scope={issueForm} />
        </form>
        {issued.challengeId && !saved.message && (
          <form
            ref={verifyForm}
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              start(() => verify(data));
            }}
            className="mt-6 space-y-4"
          >
            <input type="hidden" name="challengeId" value={issued.challengeId} />
            <label className="block text-meta font-semibold">
              Six-digit code
              <input
                className={`${fieldClass} mt-2 min-h-12`}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={verifying || sending}
              />
            </label>
            <p className="text-meta leading-6 text-ink-600">
              Saving a new contact detail signs out your other devices.
            </p>
            <button className={buttonVariants()} disabled={verifying || sending}>
              {verifying ? 'Verifying...' : 'Verify and save'}
            </button>
            <Result state={saved} scope={verifyForm} />
          </form>
        )}
      </div>
    </details>
  );
}
export default function OwnerSecurity({ data }) {
  const [pending, start] = useTransition(),
    router = useRouter();
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-h3 font-semibold">Contact details</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          <ContactForm key={`email-${data.email}`} channel="email" current={data.email} />
          <ContactForm key={`phone-${data.phone}`} channel="sms" current={data.phone} />
        </div>
      </section>
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-h3 font-semibold">Signed-in devices</h2>
          <span className="text-meta text-ink-500">
            {data.sessions.length} {data.sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        {data.sessions.length ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
            {data.sessions.map((s) => (
              <li key={s.id} className="flex items-start gap-4 p-5 sm:p-6">
                <Monitor className="mt-1 size-5 shrink-0 text-ink-500" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-meta font-semibold wrap-break-word">{s.device}</p>
                  <p className="mt-1 text-meta text-ink-600">
                    {s.current ? 'This device' : 'Other device'}
                  </p>
                  <p className="mt-2 text-meta text-ink-500">
                    Last seen{' '}
                    {new Date(s.lastSeen).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    IST
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-border bg-card p-6 text-meta text-ink-600">
            No active sessions to show.
          </p>
        )}
        <button
          className={`${buttonVariants({ variant: 'outline' })} mt-5`}
          disabled={pending || !data.sessions.some((s) => !s.current)}
          onClick={() => {
            if (!window.confirm('Sign out all your other devices?')) return;
            start(async () => {
              const result = await signOutOtherOwnerDevices();
              if (result.error) toast.error(result.error);
              else {
                toast.success(result.message);
                router.refresh();
              }
            });
          }}
        >
          {pending ? 'Signing out...' : 'Sign out other devices'}
        </button>
        <p className="mt-3 text-meta text-ink-600">
          {data.sessions.some((s) => !s.current)
            ? 'This device stays signed in.'
            : 'You have no other devices to sign out.'}
        </p>
      </section>
    </div>
  );
}
