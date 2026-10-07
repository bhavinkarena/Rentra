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
      !owner && ['verification', 'account'].includes(key)
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
