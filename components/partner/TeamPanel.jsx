'use client';

import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useActionState, useRef, useState, useTransition } from 'react';
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
function useCommand(command) {
  const [state, action, pending] = useActionState(command, {});
  const [, startTransition] = useTransition();
  const submit = (build) => (event) => {
    event.preventDefault();
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
      className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger"
    >
      {text}
    </p>
  ) : null;
}

/** The link is shown once: Rentra stores only its hash and does not send it. */
function LinkBox({ token, expiresAt }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/staff/join/${token}`;
  return (
    <div
      role="status"
      className="space-y-2 rounded-md border border-brand-200 bg-brand-50 p-3 text-meta"
    >
      <p className="font-semibold text-brand-900">Send this link to the caretaker yourself</p>
      <p className="text-tiny text-brand-800">
        For example on WhatsApp. Rentra does not send it. It works once, needs a code sent to their
        phone, and expires {ist(expiresAt)} IST. It is shown only now.
      </p>
      <input
        readOnly
        value={url}
        aria-label="Invitation link"
        className={`${input} font-mono text-tiny`}
      />
      <button
        type="button"
        className={quiet}
        onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true))}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

function PropertyChoices({ properties, selected, setSelected, error }) {
  return (
    <fieldset>
      <legend className="text-meta font-semibold text-ink-800">Properties they may operate</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {properties.map((property) => (
          <label key={property.id} className="flex items-start gap-2 text-meta">
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
            <span>{property.title}</span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-1 text-tiny font-medium text-danger">{error}</p> : null}
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

function InviteForm({ properties }) {
  const { state, pending, submit } = useCommand(inviteCaretaker);
  const formRef = useRef(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState([]);
  const [evidence, setEvidence] = useState(true);
  const e = state?.errors ?? {};
  return (
    <form ref={formRef} onSubmit={submit()} className="space-y-4">
      <ValidationSummary errors={state?.errors} scope={formRef} />
      <Failure state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-meta font-semibold text-ink-800">
          Name
          <input
            name="name"
            required
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            className={input}
          />
          {e.name ? <span className="mt-1 block text-tiny text-danger">{e.name}</span> : null}
        </label>
        <label className="block text-meta font-semibold text-ink-800">
          Mobile number
          <input
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            className={input}
          />
          {e.phone ? <span className="mt-1 block text-tiny text-danger">{e.phone}</span> : null}
        </label>
      </div>
      <PropertyChoices
        properties={properties}
        selected={selected}
        setSelected={setSelected}
        error={e.propertyIds}
      />
      <EvidenceChoice checked={evidence} onChange={setEvidence} />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
        Create invitation link
      </button>
      {state?.token ? <LinkBox token={state.token} expiresAt={state.expiresAt} /> : null}
    </form>
  );
}

function AccessForm({ member, properties }) {
  const { state, pending, submit } = useCommand(changeCaretakerAccess);
  const [selected, setSelected] = useState(member.properties.map((p) => p.id));
  const [evidence, setEvidence] = useState(member.permissions.evidence);
  return (
    <form onSubmit={submit()} className="space-y-3">
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
      <button type="submit" disabled={pending} className={quiet}>
        Save access
      </button>
      {state?.version ? (
        <p role="status" className="text-tiny font-semibold text-brand-700">
          Access saved.
        </p>
      ) : null}
    </form>
  );
}

function LinkForm({ member }) {
  const { state, pending, submit } = useCommand(issueCaretakerLink);
  return (
    <form onSubmit={submit()} className="space-y-2">
      <input type="hidden" name="staffId" value={member.id} />
      <Failure state={state} />
      <button type="submit" disabled={pending} className={quiet}>
        {member.state === 'active' ? 'New sign-in link' : 'New invitation link'}
      </button>
      {state?.token ? <LinkBox token={state.token} expiresAt={state.expiresAt} /> : null}
    </form>
  );
}

function RevokeForm({ member }) {
  const { state, pending, submit } = useCommand(revokeCaretaker);
  const [reason, setReason] = useState('');
  const [sure, setSure] = useState(false);
  return (
    <form onSubmit={submit()} className="space-y-2">
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
      <button type="submit" disabled={pending} className={`${quiet} border-danger text-danger`}>
        Revoke access
      </button>
    </form>
  );
}

const STATE = {
  active: ['Active', 'bg-success-bg text-brand-800'],
  invited: ['Invitation sent', 'bg-warning-bg text-warning'],
  invite_expired: ['Invitation expired', 'bg-ink-100 text-ink-700'],
  revoked: ['Revoked', 'bg-danger-bg text-danger'],
};

export default function TeamPanel({ team }) {
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="invite-title"
        className="rounded-lg border border-border bg-card p-5"
      >
        <h2 id="invite-title" className="text-h4 font-bold text-ink-900">
          Invite a caretaker
        </h2>
        <p className="mb-4 text-tiny text-ink-500">
          They will see visits for the properties you choose, the address and your phone number.
        </p>
        {team.properties.length ? (
          <InviteForm properties={team.properties} />
        ) : (
          <p className="text-meta text-ink-600">Add a property before inviting a caretaker.</p>
        )}
      </section>

      <section aria-labelledby="members-title" className="space-y-3">
        <h2 id="members-title" className="text-h4 font-bold text-ink-900">
          Caretakers ({team.members.length})
        </h2>
        {team.members.length ? null : <p className="text-meta text-ink-600">No caretakers yet.</p>}
        {team.members.map((member) => {
          const [label, tone] = STATE[member.state];
          return (
            <article
              key={member.id}
              aria-label={`Caretaker ${member.name}`}
              className="space-y-3 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-meta font-bold text-ink-900">{member.name}</h3>
                  <p className="text-tiny text-ink-500">
                    {member.phone}
                    {member.lastSessionAt
                      ? ` · last signed in ${ist(member.lastSessionAt)} IST`
                      : ''}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-tiny font-semibold ${tone}`}>
                  {label}
                </span>
              </div>
              <p className="text-tiny text-ink-700">
                {member.properties.map((p) => p.title).join(', ') || 'No properties'} ·{' '}
                {member.permissions.evidence ? 'may record evidence' : 'view only'}
              </p>
              {member.state === 'revoked' ? (
                <p className="text-tiny text-ink-600">
                  Revoked {ist(member.revokedAt)} IST: {member.revokedReason}. Invite the number
                  again to restore access.
                </p>
              ) : (
                <details className="rounded-md border border-border p-3">
                  <summary className="cursor-pointer text-meta font-semibold">
                    Manage access
                  </summary>
                  <div className="mt-3 space-y-5">
                    <LinkForm member={member} />
                    <AccessForm
                      key={`access-${member.version}`}
                      member={member}
                      properties={team.properties}
                    />
                    <RevokeForm key={`revoke-${member.version}`} member={member} />
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </section>

      <section
        aria-labelledby="history-title"
        className="rounded-lg border border-border bg-card p-5"
      >
        <h2 id="history-title" className="text-h4 font-bold text-ink-900">
          Membership history
        </h2>
        {team.history.length ? (
          <ol className="mt-3 space-y-2">
            {team.history.map((entry) => (
              <li key={entry.id} className="border-l-2 border-border pl-3 text-meta">
                <strong>{HISTORY[entry.action] ?? entry.action.replaceAll('_', ' ')}</strong>
                {' · '}
                {entry.staffName}
                <span className="block text-tiny text-ink-500">
                  {entry.actor === 'caretaker'
                    ? 'Caretaker'
                    : entry.actor === 'you'
                      ? 'You'
                      : 'Rentra'}{' '}
                  · {ist(entry.at)} IST
                  {entry.properties != null
                    ? ` · ${entry.properties} propert${entry.properties === 1 ? 'y' : 'ies'}`
                    : ''}
                  {entry.evidence != null
                    ? entry.evidence
                      ? ' · may record evidence'
                      : ' · view only'
                    : ''}
                </span>
                {entry.reason ? (
                  <span className="block text-tiny text-ink-700">{entry.reason}</span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-meta text-ink-600">No team changes yet.</p>
        )}
      </section>
    </div>
  );
}

const HISTORY = {
  staff_invited: 'Invited',
  staff_link_issued: 'New link issued',
  staff_invite_accepted: 'Joined',
  staff_access_changed: 'Access changed',
  staff_revoked: 'Access revoked',
};
