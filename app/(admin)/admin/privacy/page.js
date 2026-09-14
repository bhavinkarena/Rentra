import { requireAdmin } from '@/lib/auth/admin';
import { sql } from '@/lib/db';
import { readPrivacyQueue } from '@/lib/customer/privacy-admin';
import { startPrivacyReview } from './actions';
import Link from 'next/link';
export const metadata={title:'Customer privacy requests',robots:{index:false,follow:false}};
export default async function PrivacyQueuePage({searchParams}) {
  const admin=await requireAdmin();
  const raw=Number((await searchParams).offset ?? 0);
  const offset=Number.isInteger(raw) && raw>=0 && raw<=1000000 ? raw : 0;
  const requests=await readPrivacyQueue(sql,admin.id,offset);
  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-8"><h1 className="text-h1">Customer privacy requests</h1><p className="text-body text-ink-600">Open requests, oldest first, with up to 100 per page. Start review to acknowledge a request. Data export and account deletion require a separate reviewed operation; this button performs neither.</p>
    {requests.length ? <ul className="space-y-4">{requests.map(r=><li key={r.id} className="space-y-2 rounded-md border border-border bg-card p-4"><h2 className="text-h3">{r.kind==='access'?'Account data copy':'Account deletion'} · {r.state.replace('_',' ')}</h2><p className="break-all text-meta">Request: {r.id}<br/>Customer: {r.customer_id}</p><p className="text-meta">{new Date(r.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p>{r.state==='open'?<form action={startPrivacyReview}><input type="hidden" name="requestId" value={r.id}/><button className="min-h-11 rounded-md bg-brand-600 px-4 py-2 text-white">Start review</button></form>:null}</li>)}</ul>:<p>No open privacy requests.</p>}
    <nav aria-label="Privacy queue pages" className="flex gap-4">{offset>0?<Link className="inline-flex min-h-11 items-center text-brand-700 underline" href={`/admin/privacy?offset=${Math.max(0,offset-100)}`}>Previous page</Link>:null}{requests.length===100?<Link className="inline-flex min-h-11 items-center text-brand-700 underline" href={`/admin/privacy?offset=${offset+100}`}>Next page</Link>:null}</nav>
  </div>;
}
