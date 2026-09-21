import Link from 'next/link';
import { Database, FileSearch, ShieldCheck, Trash2 } from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { reviewPrivacyRequest } from '@/lib/actions/admin';
import { AdminEmpty, AdminKpiCard, AdminPage, AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';

export const metadata={title:'Customer privacy requests',robots:{index:false,follow:false}};
export default async function PrivacyQueuePage({searchParams}) {
  await requireAdmin();
  const raw=Number((await searchParams).offset ?? 0);
  const offset=Number.isInteger(raw)&&raw>=0&&raw<=1000000?raw:0;
  const requests=await adminApi.privacyQueue({offset});
  const access=requests.filter((request)=>request.kind==='access').length;
  const deletion=requests.filter((request)=>request.kind==='deletion').length;
  const open=requests.filter((request)=>request.state==='open').length;
  return <AdminPage><AdminPageHeader eyebrow="Data governance" title="Customer privacy requests" description="Acknowledge requests here. Data exports and account deletion remain separate reviewed operations; starting review performs neither."/>
    <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4"><AdminKpiCard label="On this page" value={requests.length} icon={ShieldCheck} hint="Oldest requests first"/><AdminKpiCard label="Open" value={open} icon={FileSearch} hint="Awaiting acknowledgement" tone={open?'warning':'neutral'}/><AdminKpiCard label="Data copies" value={access} icon={Database} hint="Account access requests"/><AdminKpiCard label="Deletion" value={deletion} icon={Trash2} hint="Requests needing retention review" tone={deletion?'danger':'neutral'}/></section>
    <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs"><div className="border-b border-border px-5 py-4"><h2 className="text-h4 font-bold">Request queue</h2><p className="mt-1 text-tiny text-ink-500">Showing up to 100 requests from offset {offset}</p></div>
      {requests.length?<div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-ink-25 text-[0.65rem] font-bold tracking-wider text-ink-500 uppercase"><tr><th className="px-5 py-3">Request</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Status</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-border">{requests.map((request)=><tr key={request.id} className="hover:bg-ink-25"><td className="px-5 py-4"><p className="font-semibold text-ink-900">{request.kind==='access'?'Account data copy':'Account deletion'}</p><p className="mt-1 max-w-56 truncate font-mono text-[0.65rem] text-ink-500">{request.id}</p></td><td className="px-4 py-4 max-w-48 truncate font-mono text-[0.68rem] text-ink-600">{request.customer_id}</td><td className="px-4 py-4 text-tiny text-ink-600">{new Date(request.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})}</td><td className="px-4 py-4"><StatusBadge tone={request.state==='open'?'warning':'info'}>{request.state.replaceAll('_',' ')}</StatusBadge></td><td className="px-5 py-4 text-right">{request.state==='open'?<form action={reviewPrivacyRequest}><input type="hidden" name="requestId" value={request.id}/><button className="min-h-9 rounded-md bg-brand-700 px-3 text-tiny font-semibold text-white hover:bg-brand-800">Start review</button></form>:null}</td></tr>)}</tbody></table></div>:<AdminEmpty icon={ShieldCheck} title="No open privacy requests" description="New access and deletion requests will appear here for review."/>}
      <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">{offset>0?<Link className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-tiny font-semibold" href={`/admin/privacy?offset=${Math.max(0,offset-100)}`}>← Previous</Link>:null}{requests.length===100?<Link className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-tiny font-semibold" href={`/admin/privacy?offset=${offset+100}`}>Next →</Link>:null}</footer>
    </section></AdminPage>;
}
