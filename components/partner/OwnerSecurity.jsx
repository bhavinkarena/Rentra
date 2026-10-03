'use client';
import OwnerTable from './OwnerTable';
import { useActionState, useTransition } from 'react';
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
  const [saved, verify, verifying] = useActionState(async (previous, form) => {
    const result = await confirmOwnerContact(previous, form);
    // Announce before layout revalidation remounts this contact-keyed form.
    if (result.message) toast.success(result.message);
    return result;
  }, {});
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
        <OwnerTable
          label="Active sessions"
          columns={['Device', 'Session', 'Last seen']}
          minWidth={520}
          empty={!data.sessions.length ? 'No active sessions.' : null}
        >
          {data.sessions.map((session) => (
            <tr key={session.id}>
              <td className="font-semibold">{session.device}</td>
              <td>{session.current ? 'This device' : 'Other device'}</td>
              <td className="whitespace-nowrap">
                {new Date(session.lastSeen).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                IST
              </td>
            </tr>
          ))}
        </OwnerTable>
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
