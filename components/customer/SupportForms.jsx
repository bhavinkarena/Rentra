'use client';
import { preparePhotoInput } from '@/lib/domain/photo-upload';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState, useState, useTransition } from 'react';
import { openOwnerSupport, replyOwnerSupport } from '@/lib/actions/partner';
import { useRouter } from 'next/navigation';
import { openSupport, replyCustomerSupport } from '@/lib/actions/customer';
import { replyAdminSupport } from '@/lib/actions/admin';
import { supportCategories, supportStates, ownerSupportCategories } from '@/lib/domain/help';
import {
  ISSUE_LABELS,
  REMEDY_LABELS,
  SKEW_MS,
  isLateReport,
  recordIssueEligibility,
} from '@/lib/domain/stay-issue';
const field = `${sharedFieldClass} mt-1 min-h-11`;
const button = `${sharedButtonVariants({ shape: 'pill', size: 'default' })} `;
function Result({ state }) {
  return (
    <>
      {state.error ? (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      ) : null}
      {Object.entries(state.errors || {}).map(([field, messages]) => (
        <p key={field} role="alert">
          {field}: {Array.isArray(messages) ? messages.join(' ') : messages}
        </p>
      ))}
      {state.message ? <p role="status">{state.message}</p> : null}
    </>
  );
}
export function OpenSupportForm({
  requestKey,
  orderId = '',
  privacyRequestId = '',
  category = 'other',
  owner = false,
  pendingOwner = false,
  propertyId = '',
  visitId = '',
  initialSubject = '',
}) {
  const [state, action, pending] = useActionState(owner ? openOwnerSupport : openSupport, {});
  const categories = Object.entries(owner ? ownerSupportCategories : supportCategories).filter(
    ([key]) =>
      key === 'stay_issue'
        ? false
        : !owner && ['verification', 'account'].includes(key)
          ? false
          : pendingOwner
            ? ['verification', 'account', 'other'].includes(key)
            : owner
              ? true
              : privacyRequestId
                ? key === 'privacy'
                : orderId ||
                  ['privacy', 'other', ...(owner ? ['verification', 'account'] : [])].includes(key),
  );
  const [key] = useState(requestKey),
    [subject, setSubject] = useState(initialSubject),
    [body, setBody] = useState('');
  const [topic, setTopic] = useState(
    categories.some(([k]) => k === category) ? category : categories[0][0],
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="requestKey" value={key} />
      {owner && <input type="hidden" name="visitId" value={visitId} />}
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="privacyRequestId" value={privacyRequestId} />
      {owner && <input type="hidden" name="propertyId" value={propertyId} />}
      <label className="block">
        Topic
        <select
          className={field}
          name="category"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {categories.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Subject
        <input
          className={field}
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={5}
          maxLength={120}
        />
      </label>
      <label className="block">
        How can we help?
        <textarea
          className={field}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          required
          minLength={20}
          maxLength={5000}
          aria-describedby="support-message-help"
        />
      </label>
      <p id="support-message-help" className="text-meta">
        Include the visit date and what happened. Do not send OTPs, identity documents, access
        codes, card details or bank credentials.
      </p>
      {owner && (
        <label className="block">
          Private photos (up to 3, 2MB each)
          <input
            className={field}
            type="file"
            name="photos"
            onChange={preparePhotoInput}
            multiple
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
      )}
      <button className={button} disabled={pending}>
        {pending ? <RentraLoader label="Saving…" /> : 'Send support request'}
      </button>
      <Result state={state} />
    </form>
  );
}
export function SupportReplyForm({ record, requestKey, admin = false, owner = false }) {
  const participant =
    record.participant === 'client'
      ? 'owner'
      : record.participant || (owner ? 'owner' : 'customer');
  const [state, action, pending] = useActionState(
    admin ? replyAdminSupport : owner ? replyOwnerSupport : replyCustomerSupport,
    {},
  );
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [internal, setInternal] = useState(false);
  const [key] = useState(requestKey),
    [body, setBody] = useState(''),
    [status, setStatus] = useState(admin ? 'in_progress' : 'open');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-4"
    >
      <input type="hidden" name="id" value={record.id} />
      {admin && <input type="hidden" name="from" value={record.from || '/admin/support'} />}
      <input type="hidden" name="version" value={record.version} />
      <input type="hidden" name="requestKey" value={key} />
      {admin && (
        <label className="block">
          Visibility
          <select
            className={field}
            name="internal"
            value={String(internal)}
            onChange={(e) => setInternal(e.target.value === 'true')}
          >
            <option value="false">Reply to {participant}</option>
            <option value="true">Internal note — admins only</option>
          </select>
        </label>
      )}
      <label className="block">
        {internal ? 'Internal note' : 'Your reply'}
        <textarea
          className={field}
          name="body"
          value={body}
          aria-label={internal ? 'Internal note' : 'Your reply'}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          required
          minLength={2}
          maxLength={5000}
        />
      </label>
      <label className="block">
        Status after this reply
        <select
          className={field}
          name="state"
          disabled={internal}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {Object.entries(supportStates)
            .filter(([k]) => admin || ['open', 'resolved'].includes(k))
            .map(([key, label]) => (
              <option key={key} value={key}>
                {key === 'open' ? 'Open — needs support' : label}
              </option>
            ))}
        </select>
      </label>
      {internal && <input type="hidden" name="state" value="open" />}
      <label className="block">
        Private photos
        <input
          className={field}
          type="file"
          name="photos"
          onChange={preparePhotoInput}
          multiple
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      <p className="text-meta">
        Up to 3 JPG, PNG or WebP photos, 2MB each. Do not attach identity documents, access codes or
        payment credentials.
      </p>
      <p className="text-meta">
        {internal
          ? 'This note and its photos are visible only to authorized Rentra admins.'
          : `Replies and photos are visible to this ${participant} and authorized Rentra staff.`}{' '}
        Resolving this conversation does not cancel, refund or change a booking, or complete a
        privacy request.
      </p>
      <button className={button} disabled={pending}>
        {pending ? (
          <RentraLoader label="Saving…" />
        ) : internal ? (
          'Save internal note'
        ) : (
          'Save reply and status'
        )}
      </button>
      <Result state={state} />
      {state.code === 'STALE_REQUEST' && (
        <button type="button" className="min-h-11 underline" onClick={() => router.refresh()}>
          Reload conversation
        </button>
      )}
    </form>
  );
}

const issueCopy = {
  LATE_REASON_REQUIRED: 'lateReason',
  AFFECTED_INVALID: 'affected',
  DISCOVERY_INVALID: 'discoveredAt',
};
/**
 * Story 4.1: report a problem with a stay. Values stay in state, so a refused or failed
 * submission keeps everything the guest entered; success redirects to the saved case.
 */
export function StayIssueForm({ requestKey, record }) {
  const [state, action, pending] = useActionState(openSupport, {});
  const [, startTransition] = useTransition();
  const [key] = useState(requestKey);
  const [v, setV] = useState({
    issueType: '',
    discoveredAt: '',
    affected: [],
    remedy: '',
    remedyText: '',
    lateReason: '',
    body: '',
  });
  const [errors, setErrors] = useState({});
  const set = (name) => (e) => setV((old) => ({ ...old, [name]: e.target.value }));
  const late =
    (v.discoveredAt && isLateReport(new Date(v.discoveredAt))) ||
    state.code === 'LATE_REASON_REQUIRED' ||
    v.lateReason.trim() !== '';
  // Only visits that happened, and only each visit's own booked room types: every choice passes the API.
  const roomNames = new Map((record.stay?.rooms || []).map((r) => [String(r.roomTypeId), r.name]));
  const options = recordIssueEligibility(record).visits.flatMap((visit) => [
    [visit.id, `${visit.reference} · ${visit.date}`],
    ...[...new Set(visit.issue?.roomTypeIds || [])].map((id) => [
      `${visit.id}|${id}`,
      `${visit.reference} · ${roomNames.get(id) || 'Room'}`,
    ]),
  ]);
  const serverField = issueCopy[state.code];
  const shown = { ...(serverField ? { [serverField]: state.error } : {}), ...errors };
  const describe = (name) => (shown[name] ? `issue-${name}-error` : undefined);
  const fieldError = (name) =>
    shown[name] ? (
      <p id={`issue-${name}-error`} className="mt-1 text-meta text-danger">
        {shown[name]}
      </p>
    ) : null;
  function submit(event) {
    event.preventDefault();
    const found = {};
    if (!v.issueType) found.issueType = 'Choose what went wrong.';
    const at = new Date(v.discoveredAt);
    if (!v.discoveredAt || Number.isNaN(at.getTime()))
      found.discoveredAt = 'Enter when you found the problem.';
    else if (at.getTime() > Date.now() + SKEW_MS)
      found.discoveredAt = 'This time cannot be in the future.';
    if (!v.affected.length) found.affected = 'Choose at least one visit or room.';
    if (!v.remedy) found.remedy = 'Choose the fix you would like.';
    if (v.remedy === 'other' && !v.remedyText.trim())
      found.remedyText = 'Describe the fix you would like.';
    if (late && v.lateReason.trim().length < 10)
      found.lateReason = 'Tell us why you are reporting this now (at least 10 characters).';
    if (v.body.trim().length < 10) found.body = 'Describe the problem in at least 10 characters.';
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      event.currentTarget.querySelector(`[data-field="${first}"]`)?.focus();
      return;
    }
    const data = new FormData(event.currentTarget);
    data.set('discoveredAt', at.toISOString());
    if (!v.lateReason.trim()) data.delete('lateReason');
    if (v.remedy !== 'other') data.delete('remedyText');
    startTransition(() => action(data));
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <input type="hidden" name="requestKey" value={key} />
      <input type="hidden" name="orderId" value={record.id} />
      <input type="hidden" name="category" value="stay_issue" />
      <label className="block">
        What went wrong?
        <select
          className={field}
          name="issueType"
          data-field="issueType"
          value={v.issueType}
          onChange={set('issueType')}
          aria-invalid={Boolean(shown.issueType)}
          aria-describedby={describe('issueType')}
        >
          <option value="">Choose…</option>
          {Object.entries(ISSUE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        {fieldError('issueType')}
      </label>
      <label className="block">
        When did you find it? (your local time)
        <input
          className={field}
          type="datetime-local"
          name="discoveredAt"
          data-field="discoveredAt"
          value={v.discoveredAt}
          onChange={set('discoveredAt')}
          aria-invalid={Boolean(shown.discoveredAt)}
          aria-describedby={describe('discoveredAt')}
        />
        {fieldError('discoveredAt')}
      </label>
      <fieldset aria-describedby={describe('affected')}>
        <legend>What is affected?</legend>
        {options.map(([value, label], index) => (
          <label key={value} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              name="affected"
              value={value}
              className="size-5"
              data-field={index === 0 ? 'affected' : undefined}
              checked={v.affected.includes(value)}
              onChange={(e) =>
                setV((old) => ({
                  ...old,
                  affected: e.target.checked
                    ? [...old.affected, value]
                    : old.affected.filter((x) => x !== value),
                }))
              }
            />
            {label}
          </label>
        ))}
        {fieldError('affected')}
      </fieldset>
      <label className="block">
        What would fix it for you?
        <select
          className={field}
          name="remedy"
          data-field="remedy"
          value={v.remedy}
          onChange={set('remedy')}
          aria-invalid={Boolean(shown.remedy)}
          aria-describedby={describe('remedy')}
        >
          <option value="">Choose…</option>
          {Object.entries(REMEDY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-meta text-ink-600">
          This is a request; support decides any remedy.
        </span>
        {fieldError('remedy')}
      </label>
      {v.remedy === 'other' && (
        <label className="block">
          Describe the fix
          <input
            className={field}
            name="remedyText"
            data-field="remedyText"
            maxLength={500}
            value={v.remedyText}
            onChange={set('remedyText')}
            aria-invalid={Boolean(shown.remedyText)}
            aria-describedby={describe('remedyText')}
          />
          {fieldError('remedyText')}
        </label>
      )}
      {late && (
        <label className="block">
          Why are you reporting this more than 72 hours after finding it?
          <textarea
            className={field}
            name="lateReason"
            data-field="lateReason"
            rows={3}
            maxLength={500}
            value={v.lateReason}
            onChange={set('lateReason')}
            aria-invalid={Boolean(shown.lateReason)}
            aria-describedby={describe('lateReason')}
          />
          <span className="mt-1 block text-meta text-ink-600">
            Late reports are still reviewed.
          </span>
          {fieldError('lateReason')}
        </label>
      )}
      <label className="block">
        What happened?
        <textarea
          className={field}
          name="body"
          data-field="body"
          rows={5}
          maxLength={2000}
          value={v.body}
          onChange={set('body')}
          aria-invalid={Boolean(shown.body)}
          aria-describedby={describe('body')}
        />
        {fieldError('body')}
      </label>
      <label className="block">
        Photos (optional, up to 3 JPG, PNG or WebP, 2MB each)
        <input
          className={field}
          type="file"
          name="photos"
          onChange={preparePhotoInput}
          multiple
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      <p className="text-meta">
        You do not need to contact the owner first. Reporting a problem does not cancel or refund
        your booking. Do not send access codes, OTPs or payment details.
      </p>
      <button className={button} disabled={pending}>
        {pending ? <RentraLoader label="Sending…" /> : 'Report problem'}
      </button>
      {state.error && !serverField && (
        <p role="alert" className="text-danger">
          {state.error} Your report has not been saved; your answers are kept.
        </p>
      )}
      {serverField && (
        <p role="alert" className="text-danger">
          Check the highlighted answer. Your report has not been saved.
        </p>
      )}
    </form>
  );
}
