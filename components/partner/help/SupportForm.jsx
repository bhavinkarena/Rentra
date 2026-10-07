'use client';
import { preparePhotoInput } from '@/lib/domain/photo-upload';
import { useActionState, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openOwnerSupport, replyOwnerSupport } from '@/lib/actions/partner';
import { ownerSupportCategories } from '@/lib/domain/help';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import ValidationSummary from '@/components/portal/ValidationSummary';
const field = `${fieldClass} mt-2 min-h-12`;
export default function SupportForm({
  requestKey,
  record,
  pendingOwner = false,
  category = 'other',
  initialSubject = '',
  orderId = '',
  propertyId = '',
  visitId = '',
}) {
  const [state, action, pending] = useActionState(
    record ? replyOwnerSupport : openOwnerSupport,
    {},
  );
  const [, startTransition] = useTransition();
  const form = useRef(null),
    router = useRouter();
  const categories = Object.entries(ownerSupportCategories).filter(
    ([k]) => !pendingOwner || ['verification', 'account', 'other'].includes(k),
  );
  const [key] = useState(requestKey);
  const [body, setBody] = useState(''),
    [subject, setSubject] = useState(initialSubject);
  const [topic, setTopic] = useState(
    categories.some(([k]) => k === category) ? category : categories[0][0],
  );
  const [status, setStatus] = useState('open');
  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-6"
    >
      <input type="hidden" name="requestKey" value={key} />
      {record ? (
        <>
          <input type="hidden" name="id" value={record.id} />
          <input type="hidden" name="version" value={record.version} />
        </>
      ) : (
        <>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="visitId" value={visitId} />
          <input type="hidden" name="privacyRequestId" value="" />
        </>
      )}
      <fieldset disabled={pending} className="min-w-0 space-y-6">
        {!record && (
          <>
            <label className="block text-meta font-semibold">
              Topic
              <select
                name="category"
                className={field}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {categories.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-meta font-semibold">
              Subject
              <input
                name="subject"
                className={field}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                minLength={5}
                maxLength={120}
                aria-invalid={Boolean(state.errors?.subject)}
              />
            </label>
          </>
        )}
        <label className="block text-meta font-semibold">
          {record ? 'Your reply' : 'How can we help?'}
          <textarea
            name="body"
            aria-label={record ? 'Your reply' : 'How can we help?'}
            className={`${field} py-3 font-normal`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            required
            minLength={record ? 2 : 20}
            maxLength={5000}
            aria-invalid={Boolean(state.errors?.body)}
            aria-describedby="support-message-help"
          />
        </label>
        <p id="support-message-help" className="text-meta leading-6 text-ink-600">
          Include what happened and any relevant visit date. Do not send OTPs, identity documents,
          access codes, card details or bank credentials.
        </p>
        <label className="block text-meta font-semibold">
          Private photos <span className="font-normal text-ink-500">(optional)</span>
          <input
            type="file"
            name="photos"
            onChange={preparePhotoInput}
            className={`${field} py-2 text-meta font-normal`}
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="support-photo-help"
            aria-invalid={Boolean(state.errors?.photos)}
          />
        </label>
        <p id="support-photo-help" className="text-meta leading-6 text-ink-600">
          Up to 3 JPG, PNG or WebP photos, 2MB each. Visible to you and authorised Rentra staff.
        </p>
        {record && (
          <>
            <label className="block text-meta font-semibold">
              Status after this reply
              <select
                className={field}
                name="state"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="open">Open - needs support</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <p className="text-meta leading-6 text-ink-600">
              Resolving this conversation does not cancel, refund or change a booking, or complete a
              privacy request.
            </p>
          </>
        )}
      </fieldset>
      <ValidationSummary errors={state.errors} scope={form} />
      {state.error && (
        <p role="alert" className="text-meta text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-meta text-brand-800">
          {state.message}
        </p>
      )}
      {state.code === 'STALE_REQUEST' && (
        <button
          type="button"
          className="min-h-11 font-semibold text-brand-800 underline"
          onClick={() => router.refresh()}
        >
          Reload conversation
        </button>
      )}
      <button disabled={pending} className={`${buttonVariants()} w-full sm:w-auto`}>
        {pending ? 'Saving...' : record ? 'Save reply and status' : 'Send support request'}
      </button>
    </form>
  );
}
