'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import { useActionState, useState, useTransition } from 'react';
import { openOwnerSupport, replyOwnerSupport } from '@/lib/actions/partner';
import { useRouter } from 'next/navigation';
import { openSupport, replyCustomerSupport } from '@/lib/actions/customer';
import { replyAdminSupport } from '@/lib/actions/admin';
import { supportCategories, supportStates } from '@/lib/domain/help';
const field =
  'mt-1 block min-h-11 w-full rounded-lg border border-border bg-card p-3 text-base focus:border-brand-600 focus:outline-none sm:text-sm';
const button =
  'min-h-11 rounded-full bg-brand-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50';
function Result({ state }) {
  return (
    <>
      {state.error ? (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      ) : null}
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
  propertyId = '',
}) {
  const [state, action, pending] = useActionState(owner ? openOwnerSupport : openSupport, {});
  const categories = Object.entries(supportCategories).filter(([key]) =>
    privacyRequestId ? key === 'privacy' : orderId || ['privacy', 'other'].includes(key),
  );
  const [key] = useState(requestKey),
    [subject, setSubject] = useState(''),
    [body, setBody] = useState('');
  const [topic, setTopic] = useState(
    categories.some(([k]) => k === category) ? category : categories[0][0],
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="requestKey" value={key} />
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
      <button className={button} disabled={pending}>
        {pending ? <RentraLoader label="Saving…" /> : 'Send support request'}
      </button>
      <Result state={state} />
    </form>
  );
}
export function SupportReplyForm({ record, requestKey, admin = false, owner = false }) {
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
            <option value="false">Reply to {record.participant || 'customer'}</option>
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
          : `Replies and photos are visible to this ${record.participant || (owner ? 'client' : 'customer')} and authorized Rentra staff.`}{' '}
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
