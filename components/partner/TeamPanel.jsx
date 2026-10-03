'use client';
import OwnerTable from './OwnerTable';
import ConfirmedForm from '@/components/portal/ConfirmedForm';
import { EmptyState } from '@/components/ui/empty-state';

import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useActionState, useRef, useState, useTransition, useEffect } from 'react';
import toast from 'react-hot-toast';
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
  const [state, action, pending] = useActionState(async (previous, form) => {
    const result = await command(previous, form);
    if (result?.message || result?.version) {
      toast.success(result.message || 'Saved.');
      onSuccess?.(result);
    }
    return result;
  }, {});
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

/** The token is shown once; delivery state distinguishes a send from a copy-link fallback. */
function LinkBox({ token, expiresAt, deliveryState }) {
  const [copied, setCopied] = useState(false);
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
        readOnly
        value={url}
        aria-label="Invitation link"
        className={`${input} font-mono text-tiny`}
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
  return (
    <fieldset>
      <legend className="text-meta font-semibold text-ink-800">Properties they may operate</legend>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={drafts} onChange={(e) => setDrafts(e.target.checked)} />{' '}
        Show draft and other properties
      </label>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {properties
          .filter((p) => drafts || p.status === 'live' || selected.includes(p.id))
          .map((property) => (
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
      <label className="flex min-h-11 items-center gap-2">
        <input type="hidden" name="guestContact" value="false" />
        <input type="checkbox" name="guestContact" defaultChecked={true} />
        Can see guest contact on visit day
      </label>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? <LoaderCircle className="size-4" aria-hidden="true" /> : null}
        Invite caretaker
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
      <label className="flex min-h-11 items-center gap-2">
        <input type="hidden" name="guestContact" value="false" />
        <input
          type="checkbox"
          name="guestContact"
          defaultChecked={member.permissions.guestContact !== false}
        />
        Can see guest contact on visit day
      </label>
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

function RevokeForm({ member }) {
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
      <button type="submit" disabled={pending} className={`${quiet} border-danger text-danger`}>
        Revoke access
      </button>
    </ConfirmedForm>
  );
}

const STATE = {
  active: ['Active', 'bg-success-bg text-brand-800'],
  invited: ['Link created — not used', 'bg-warning-bg text-warning'],
  invite_expired: ['Invitation expired', 'bg-ink-100 text-ink-700'],
  revoked: ['Removed', 'bg-danger-bg text-danger'],
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
          <EmptyState
            variant="compact"
            title="Add a property first"
            description="Choose a property for your caretaker to operate."
            actionHref="/partner/listings"
            actionLabel="Add property"
          />
        )}
      </section>

      <section aria-labelledby="members-title" className="space-y-3">
        <h2 id="members-title" className="text-h4 font-bold text-ink-900">
          Caretakers ({team.members.length})
        </h2>
        {team.members.length ? null : (
          <EmptyState
            variant="compact"
            title="No caretakers yet"
            description="Invite the person who opens the gate. They will see arrivals, never your earnings."
            actionHref="#invite-title"
            actionLabel="Invite a caretaker"
          />
        )}
        <OwnerTable
          label="Caretakers"
          columns={['Caretaker', 'Status', 'Properties / permissions', 'Action']}
          empty={!team.members.length ? 'No caretakers yet.' : null}
        >
          {team.members.map((member) => {
            const [originalLabel, tone] = STATE[member.state];
            const label =
              member.state === 'invited' &&
              ['accepted', 'delivered'].includes(member.pendingInvite?.deliveryState)
                ? 'Invite sent'
                : originalLabel;
            return (
              <tr key={member.id} aria-label={`Caretaker ${member.name}`}>
                <td>
                  <strong className="block">{member.name}</strong>
                  <span className="block text-tiny text-ink-600">{member.phone}</span>
                  {member.lastSessionAt && (
                    <span className="block text-tiny text-ink-600">
                      Last signed in {ist(member.lastSessionAt)} IST
                    </span>
                  )}
                </td>
                <td>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-tiny font-semibold ${tone}`}
                  >
                    {label}
                  </span>
                </td>
                <td>
                  {member.properties.map((p) => p.title).join(', ') || 'No properties'}
                  <span className="block text-tiny text-ink-600">
                    {member.permissions.evidence ? 'May record evidence' : 'View only'}
                  </span>
                </td>
                <td className="min-w-72">
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
                </td>
              </tr>
            );
          })}
        </OwnerTable>
      </section>

      <section
        aria-labelledby="history-title"
        className="rounded-lg border border-border bg-card p-5"
      >
        <h2 id="history-title" className="text-h4 font-bold text-ink-900">
          Membership history
        </h2>
        {team.history.length ? (
          <OwnerTable
            label="Membership history"
            columns={['Change', 'Caretaker', 'Changed by', 'Date', 'Details']}
          >
            {team.history.map((entry) => (
              <tr key={entry.id}>
                <td className="font-semibold">
                  {HISTORY[entry.action] ?? entry.action.replaceAll('_', ' ')}
                </td>
                <td>{entry.staffName}</td>
                <td>
                  {entry.actor === 'caretaker'
                    ? 'Caretaker'
                    : entry.actor === 'you'
                      ? 'You'
                      : 'Rentra'}
                </td>
                <td className="whitespace-nowrap">{ist(entry.at)} IST</td>
                <td>
                  {entry.properties != null ? `${entry.properties} properties` : ''}
                  {entry.evidence != null
                    ? entry.evidence
                      ? ' · May record evidence'
                      : ' · View only'
                    : ''}
                  {entry.reason && <span className="block">{entry.reason}</span>}
                </td>
              </tr>
            ))}
          </OwnerTable>
        ) : (
          <EmptyState
            variant="compact"
            title="No team changes yet"
            description="Invitations and changes to caretaker access appear here."
          />
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
