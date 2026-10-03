'use client';
import ConfirmedForm from '@/components/portal/ConfirmedForm';

import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useActionState, useRef, useState, useTransition, useId, useEffect } from 'react';
import Link from '@/components/navigation/NavigationLink';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import LoaderCircle from '@/components/ui/rentra-loader';
import ValidationSummary from '@/components/portal/ValidationSummary';
import {
  changeCaretakerAccess,
  inviteCaretaker,
  issueCaretakerLink,
  revokeCaretaker,
} from '@/lib/actions/partner';

const input = `${sharedFieldClass} mt-1 min-h-11`;
const primary = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
const quiet =
  'inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-tiny font-semibold text-ink-800 hover:bg-ink-50 disabled:cursor-wait disabled:opacity-60';
const ist = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/**
 * Submitted from a transition so a refused save keeps the chosen checkboxes
 * (React resets `<form action>` fields, and controlled checkboxes with them).
 */
function useCommand(command, onSuccess) {
  const router = useRouter();
  const submittedForm = useRef(null);
  const [state, action, pending] = useActionState(async (previous, form) => {
    const result = await command(previous, form);
    if (result?.message || result?.version) {
      toast.success(result.message || 'Saved.');
      onSuccess?.(result);
      router.refresh();
    } else if (result?.errors || result?.error) {
      submittedForm.current?.dispatchEvent(new Event('rentra:form-dirty', { bubbles: true }));
    }
    return result;
  }, {});
  const [, startTransition] = useTransition();
  const submit = (build) => (event) => {
    event.preventDefault();
    submittedForm.current = event.currentTarget;
    const data = new FormData(event.currentTarget);
    build?.(data);
    startTransition(() => action(data));
  };
  return { state, pending, submit };
}

function Failure({ state }) {
  const text = state?.errors?._ ?? (state?.errors ? null : state?.error);
  return text ? (
    <p
      role="alert"
      className="rounded-md border border-danger/20 bg-danger-bg p-3 text-meta text-danger"
    >
      {text}
    </p>
  ) : null;
}

/** The token is shown once; delivery state distinguishes a send from a copy-link fallback. */
function LinkBox({ token, expiresAt, deliveryState }) {
  const [copied, setCopied] = useState(false);
  const link = useRef(null);
  useEffect(() => {
    link.current?.focus();
  }, []);
  const url = `${window.location.origin}/staff/join/${token}`;
  return (
    <div
      role="status"
      className="space-y-2 rounded-md border border-brand-200 bg-brand-50 p-3 text-meta"
    >
      <p className="font-semibold text-brand-900">
        {['accepted', 'delivered'].includes(deliveryState)
          ? 'Invite sent'
          : 'Link created — not used'}
      </p>
      <p className="text-tiny text-brand-800">
        Copy this link as a fallback. It works once, needs a code sent to their phone, and expires{' '}
        {ist(expiresAt)} IST. It is shown only now.
      </p>
      <input
        ref={link}
        readOnly
        value={url}
        aria-label="Invitation link"
        className={`${input} text-meta`}
      />
      <button
        type="button"
        className={quiet}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('Invitation link copied.');
          } catch {
            toast.error('Could not copy. Select the link and copy it manually.');
          }
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

function PropertyChoices({ properties, selected, setSelected, error }) {
  const [drafts, setDrafts] = useState(false);
  const errorId = useId();
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="text-meta font-semibold text-ink-800">Properties they may operate</legend>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={drafts} onChange={(e) => setDrafts(e.target.checked)} />{' '}
        Show draft and other properties
      </label>
      <div className="mt-2 divide-y divide-border rounded-md border border-border">
        {properties
          .filter((p) => drafts || p.status === 'live' || selected.includes(p.id))
          .map((property) => (
            <label
              key={property.id}
              className="flex min-h-14 items-center gap-3 px-4 py-3 text-meta"
            >
              <input
                type="checkbox"
                name="propertyIds"
                value={property.id}
                checked={selected.includes(property.id)}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, property.id]
                      : selected.filter((id) => id !== property.id),
                  )
                }
                className="mt-0.5 size-4 accent-brand-700"
              />
              <span className="min-w-0 break-words">
                {property.title}
                <span className="mt-0.5 block text-tiny text-ink-500">
                  {property.status === 'live' ? 'Live' : 'Not live'}
                </span>
              </span>
            </label>
          ))}
      </div>
      {error ? (
        <p id={errorId} className="mt-1 text-meta font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function EvidenceChoice({ checked, onChange }) {
  return (
    <label className="flex items-start gap-2 text-meta">
      <input
        type="checkbox"
        name="evidence"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-brand-700"
      />
      <span>
        May record handover, return and completion
        <span className="block text-tiny text-ink-500">
          Without this they can only view visits. Caretakers never see prices, earnings, your
          documents or your team, and cannot invite anyone.
        </span>
      </span>
    </label>
  );
}

export function InviteForm({ properties }) {
  const formRef = useRef(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState([]);
  const [evidence, setEvidence] = useState(true);
  const { state, pending, submit } = useCommand(inviteCaretaker, (result) => {
    if (result.token) {
      setName('');
      setPhone('');
      setSelected([]);
      setEvidence(true);
      formRef.current?.reset();
    }
  });
  const e = state?.errors ?? {};
  return (
    <form ref={formRef} onSubmit={submit()} className="space-y-6">
      <ValidationSummary errors={state?.errors} scope={formRef} />
      <Failure state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-meta font-semibold text-ink-800">
          Name
          <input
            name="name"
            aria-invalid={e.name ? true : undefined}
            aria-describedby={e.name ? 'invite-name-error' : undefined}
            required
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            className={input}
          />
          {e.name ? (
            <span id="invite-name-error" className="mt-1 block text-meta text-danger">
              {e.name}
            </span>
          ) : null}
        </label>
        <label className="block text-meta font-semibold text-ink-800">
          Mobile number
          <input
            name="phone"
            aria-invalid={e.phone ? true : undefined}
            aria-describedby={e.phone ? 'invite-phone-error' : undefined}
            type="tel"
            required
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            className={input}
          />
          {e.phone ? (
            <span id="invite-phone-error" className="mt-1 block text-meta text-danger">
              {e.phone}
            </span>
          ) : null}
        </label>
      </div>
      <PropertyChoices
        properties={properties}
        selected={selected}
        setSelected={setSelected}
        error={e.propertyIds}
      />
      <EvidenceChoice checked={evidence} onChange={setEvidence} />
      <label className="flex min-h-11 items-center gap-2">
        <input type="hidden" name="guestContact" value="false" />
        <input type="checkbox" name="guestContact" defaultChecked={true} />
        Can see guest contact on visit day
      </label>
      <button type="submit" disabled={pending || Boolean(state?.token)} className={primary}>
        {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
        {state?.token
          ? 'Invitation created'
          : pending
            ? 'Creating invitation...'
            : 'Invite caretaker'}
      </button>
      {state?.token ? (
        <div className="space-y-3">
          <LinkBox
            token={state.token}
            expiresAt={state.expiresAt}
            deliveryState={state.deliveryState}
          />
          <Link
            href="/partner/team"
            className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-800 hover:underline"
          >
            View caretakers
          </Link>
        </div>
      ) : null}
    </form>
  );
}

export function AccessForm({ member, properties }) {
  const { state, pending, submit } = useCommand(changeCaretakerAccess);
  const [selected, setSelected] = useState(member.properties.map((p) => p.id));
  const [evidence, setEvidence] = useState(member.permissions.evidence);
  return (
    <form onSubmit={submit()} className="space-y-6">
      <input type="hidden" name="staffId" value={member.id} />
      <input type="hidden" name="expectedVersion" value={member.version} />
      <Failure state={state} />
      <PropertyChoices
        properties={properties}
        selected={selected}
        setSelected={setSelected}
        error={state?.errors?.propertyIds}
      />
      <EvidenceChoice checked={evidence} onChange={setEvidence} />
      <label className="flex min-h-11 items-center gap-2">
        <input type="hidden" name="guestContact" value="false" />
        <input
          type="checkbox"
          name="guestContact"
          defaultChecked={member.permissions.guestContact !== false}
        />
        Can see guest contact on visit day
      </label>
      <button type="submit" disabled={pending || Boolean(state?.version)} className={primary}>
        {pending || state?.version ? 'Saving...' : 'Save access'}
      </button>
    </form>
  );
}

export function LinkForm({ member }) {
  const { state, pending, submit } = useCommand(issueCaretakerLink);
  return (
    <form onSubmit={submit()} className="space-y-2">
      <input type="hidden" name="staffId" value={member.id} />
      <Failure state={state} />
      <button type="submit" disabled={pending} className={quiet}>
        {pending
          ? 'Creating link...'
          : member.state === 'active'
            ? 'New sign-in link'
            : 'New invitation link'}
      </button>
      {state?.token ? (
        <LinkBox
          token={state.token}
          expiresAt={state.expiresAt}
          deliveryState={state.deliveryState}
        />
      ) : null}
    </form>
  );
}

export function RevokeForm({ member }) {
  const { state, pending, submit } = useCommand(revokeCaretaker);
  const [reason, setReason] = useState('');
  const [sure, setSure] = useState(false);
  return (
    <ConfirmedForm
      title="Revoke caretaker access?"
      description="Their signed-in sessions and unused invitation links will stop working."
      confirmLabel="Revoke access"
      danger
      onSubmit={submit()}
      className="space-y-2"
    >
      <input type="hidden" name="staffId" value={member.id} />
      <input type="hidden" name="expectedVersion" value={member.version} />
      <Failure state={state} />
      <label className="block text-meta font-semibold text-ink-800">
        Reason for revoking
        <input
          name="reason"
          required
          minLength={4}
          maxLength={500}
          value={reason}
          onChange={(ev) => setReason(ev.target.value)}
          className={input}
        />
        {state?.errors?.reason ? (
          <span className="mt-1 block text-tiny text-danger">{state.errors.reason}</span>
        ) : null}
      </label>
      <label className="flex items-start gap-2 text-meta">
        <input
          type="checkbox"
          required
          checked={sure}
          onChange={(ev) => setSure(ev.target.checked)}
          className="mt-0.5 size-4 accent-brand-700"
        />
        <span>
          End their access now. Signed-in sessions stop on their next action and unused links stop
          working.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending || Boolean(state?.version)}
        className={`${quiet} border-danger text-danger`}
      >
        {pending || state?.version ? 'Revoking...' : 'Revoke access'}
      </button>
    </ConfirmedForm>
  );
}
