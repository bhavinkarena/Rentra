'use client';

import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useActionState, useState } from 'react';
import LoaderCircle from '@/components/ui/rentra-loader';
import {
  acceptInvitation,
  sendJoinCode,
  sendLoginCode,
  signInCaretaker,
  signOutCaretaker,
} from '@/lib/actions/staff';

const input = `${sharedFieldClass} mt-1 min-h-12`;
const primary = `${sharedButtonVariants({ shape: 'default', size: 'lg' })} w-full`;

function Problem({ state, field }) {
  const text = field
    ? state?.errors?.[field]
    : (state?.errors?._ ?? (state?.errors ? null : state?.error));
  return text ? (
    <p role="alert" className="mt-2 text-meta font-medium text-danger">
      {text}
    </p>
  ) : null;
}

function Submit({ pending, children }) {
  return (
    <button type="submit" disabled={pending} className={primary}>
      {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Accept an owner's invitation: the link plus a code sent to the invited phone. */
export function JoinForm({ token, phoneHint }) {
  const [sendState, send, sending] = useActionState(sendJoinCode, {});
  const [joinState, join, joining] = useActionState(acceptInvitation, {});
  const [code, setCode] = useState('');
  const sent = sendState?.step === 'code' || joinState?.step === 'code';
  return (
    <div className="space-y-5">
      <form action={send}>
        <input type="hidden" name="token" value={token} />
        <p className="mb-3 text-meta text-ink-700">
          We send a 6-digit code to the phone number ending in <strong>{phoneHint}</strong>.
        </p>
        <Submit pending={sending}>{sent ? 'Send a new code' : 'Send code'}</Submit>
        <Problem state={sendState} />
        <Problem state={sendState} field="code" />
      </form>
      {sent ? (
        <form action={join} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <label className="block text-meta font-semibold text-ink-800">
            Code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="\d{6}"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={input}
            />
          </label>
          <Problem state={joinState} field="code" />
          <Problem state={joinState} />
          <Submit pending={joining}>Join and continue</Submit>
        </form>
      ) : null}
    </div>
  );
}

export function StaffLoginForm() {
  const [sendState, send, sending] = useActionState(sendLoginCode, {});
  const [loginState, login, signing] = useActionState(signInCaretaker, {});
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const sent = sendState?.step === 'code' || loginState?.step === 'code';
  return (
    <div className="space-y-5">
      <form action={send} className="space-y-3">
        <label className="block text-meta font-semibold text-ink-800">
          Mobile number
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={input}
          />
        </label>
        <Problem state={sendState} field="phone" />
        <Problem state={sendState} />
        <Submit pending={sending}>{sent ? 'Send a new code' : 'Send code'}</Submit>
        {sent ? (
          <p role="status" className="text-tiny text-ink-600">
            If this number has caretaker access, a code is on its way.
          </p>
        ) : null}
      </form>
      {sent ? (
        <form action={login} className="space-y-3">
          <input type="hidden" name="phone" value={phone} />
          <label className="block text-meta font-semibold text-ink-800">
            Code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="\d{6}"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={input}
            />
          </label>
          <Problem state={loginState} field="code" />
          <Problem state={loginState} />
          <Submit pending={signing}>Sign in</Submit>
        </form>
      ) : null}
    </div>
  );
}

export function StaffSignOut() {
  const [, action, pending] = useActionState(signOutCaretaker, {});
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50"
      >
        Sign out
      </button>
    </form>
  );
}
