'use client';
import { useActionState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  requestOwnerContact,
  confirmOwnerContact,
  signOutOtherOwnerDevices,
} from '@/lib/actions/partner';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
function Result({ state }) {
  return (
    <>
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
    </>
  );
}
function ContactForm({ channel, current }) {
  const [issued, issue, sending] = useActionState(requestOwnerContact, {});
  const [saved, verify, verifying] = useActionState(confirmOwnerContact, {});
  const router = useRouter();
  useEffect(() => {
    if (saved.message) {
      toast.success(saved.message);
      router.refresh();
    }
  }, [saved, router]);
  return (
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="text-h3">{channel === 'email' ? 'Email address' : 'Mobile number'}</h2>
      <p>{current || 'Not added'}</p>
      <form action={issue} className="space-y-3">
        <input type="hidden" name="channel" value={channel} />
        <label className="block">
          {channel === 'email' ? 'New email address' : 'New mobile number (+91)'}
          <input
            className={`${fieldClass} mt-1`}
            type={channel === 'email' ? 'email' : 'tel'}
            name="identifier"
            required
            autoComplete={channel === 'email' ? 'email' : 'tel'}
            placeholder={channel === 'sms' ? '+919876543210' : undefined}
          />
        </label>
        <button className={buttonVariants()} disabled={sending}>
          {sending ? 'Sending…' : 'Send verification code'}
        </button>
        <Result state={issued} />
      </form>
      {issued.challengeId && !saved.message && (
        <form action={verify} className="space-y-3">
          <input type="hidden" name="challengeId" value={issued.challengeId} />
          <label className="block">
            Six-digit code
            <input
              className={`${fieldClass} mt-1`}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </label>
          <p className="text-sm">Saving a new contact detail signs out your other devices.</p>
          <button className={buttonVariants()} disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify and save'}
          </button>
          <Result state={saved} />
        </form>
      )}
    </section>
  );
}
export default function OwnerSecurity({ data }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-5">
      <ContactForm key={`email-${data.email}`} channel="email" current={data.email} />
      <ContactForm key={`phone-${data.phone}`} channel="sms" current={data.phone} />
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-h3">Active sessions</h2>
        <ul className="divide-y">
          {data.sessions.map((s) => (
            <li key={s.id} className="py-3">
              <strong>{s.device}</strong> {s.current && <span>· This device</span>}
              <p className="text-sm">
                Last seen{' '}
                {new Date(s.lastSeen).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                IST
              </p>
            </li>
          ))}
        </ul>
        <button
          className={buttonVariants()}
          disabled={pending}
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
          {pending ? 'Signing out…' : 'Sign out other devices'}
        </button>
      </section>
    </div>
  );
}
