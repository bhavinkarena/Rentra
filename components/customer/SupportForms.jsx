'use client';
import { useActionState, useState } from 'react';
import { openSupport, replyCustomerSupport } from '@/lib/actions/customer';
import { replyAdminSupport } from '@/lib/actions/admin';
import { supportCategories, supportStates } from '@/lib/domain/help';
const field = 'mt-1 block min-h-11 w-full rounded-md border border-border bg-background p-3';
const button = 'min-h-11 rounded-md bg-brand-700 px-5 py-3 font-semibold text-white disabled:opacity-50';
function Result({ state }) { return <>{state.error ? <p role="alert" className="text-danger">{state.error}</p> : null}{state.message ? <p role="status">{state.message}</p> : null}</>; }
export function OpenSupportForm({ requestKey, orderId = '', privacyRequestId = '', category = 'other' }) {
  const [state, action, pending] = useActionState(openSupport, {});
  const categories = Object.entries(supportCategories).filter(([key]) => privacyRequestId ? key === 'privacy' : orderId || ['privacy','other'].includes(key));
  const [key] = useState(requestKey), [subject, setSubject] = useState(''), [body, setBody] = useState('');
  const [topic, setTopic] = useState(categories.some(([k]) => k === category) ? category : categories[0][0]);
  return <form action={action} className="space-y-5"><input type="hidden" name="requestKey" value={key}/><input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="privacyRequestId" value={privacyRequestId}/>
    <label className="block">Topic<select className={field} name="category" value={topic} onChange={e => setTopic(e.target.value)}>{categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label className="block">Subject<input className={field} name="subject" value={subject} onChange={e => setSubject(e.target.value)} required minLength={5} maxLength={120}/></label>
    <label className="block">How can we help?<textarea className={field} name="body" value={body} onChange={e => setBody(e.target.value)} rows={6} required minLength={20} maxLength={5000} aria-describedby="support-message-help"/></label>
    <p id="support-message-help" className="text-meta">Include the visit date and what happened. Do not send OTPs, identity documents, access codes, card details or bank credentials.</p>
    <button className={button} disabled={pending}>{pending ? 'Saving…' : 'Send support request'}</button><Result state={state}/>
  </form>;
}
export function SupportReplyForm({ record, requestKey, admin = false }) {
  const [state, action, pending] = useActionState(admin ? replyAdminSupport : replyCustomerSupport, {});
  const [key] = useState(requestKey), [body, setBody] = useState(''), [status, setStatus] = useState(admin ? 'in_progress' : 'open');
  return <form action={action} className="space-y-4"><input type="hidden" name="id" value={record.id}/><input type="hidden" name="version" value={record.version}/><input type="hidden" name="requestKey" value={key}/>
    <label className="block">Your reply<textarea className={field} name="body" value={body} onChange={e => setBody(e.target.value)} rows={5} required minLength={2} maxLength={5000}/></label>
    <label className="block">Status after this reply<select className={field} name="state" value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(supportStates).filter(([k]) => admin || ['open','resolved'].includes(k)).map(([key,label]) => <option key={key} value={key}>{key === 'open' ? 'Open — needs support' : label}</option>)}</select></label>
    <p className="text-meta">Replies are visible to the customer and Rentra staff. Resolving this conversation does not cancel, refund or change a booking, or complete a privacy request.</p>
    <button className={button} disabled={pending}>{pending ? 'Saving…' : 'Save reply and status'}</button><Result state={state}/>
  </form>;
}
