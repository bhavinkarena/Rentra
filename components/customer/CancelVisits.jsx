'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { previewCustomerCancellation, cancelCustomerVisits } from '@/lib/booking/cancellation-actions';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';

export default function CancelVisits({record}) {
  const [selected,setSelected]=useState([]),[preview,setPreview]=useState(null),[receipt,setReceipt]=useState(null);
  const [reason,setReason]=useState(''),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const request=useRef(null),gate=useRef(false);
  async function run(commit=false) {
    if(gate.current) return;
    gate.current=true;setBusy(true);setError('');
    try {
      if(commit) {
        if(!accepted||!preview) return;
        // Reuse the exact request after a lost response, including its reason and hash.
        request.current??={orderId:record.id,visitIds:selected,hash:preview.hash,accepted:true,reason,idempotencyKey:crypto.randomUUID()};
        const result=await cancelCustomerVisits(request.current);
        if(result.error){setError(result.error);setPreview(null);setAccepted(false);request.current=null;}
        else setReceipt(result.receipt);
      } else {
        const result=await previewCustomerCancellation({orderId:record.id,visitIds:selected});
        if(result.error) setError(result.error);else {setPreview(result.preview);setAccepted(false);request.current=null;}
      }
    } catch {setError('The response was lost. Retry this same request or open your booking record to check which visits were cancelled.');}
    finally {gate.current=false;setBusy(false);}
  }
  return <div className="space-y-6"><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href={`/bookings/${record.id}`}>Back to booking record</Link><h1 className="text-h1">{receipt?'Visits cancelled':'Cancel selected visits'}</h1><h2 className="text-h3">{record.title}</h2>
    <p>Only the selected visits are cancelled. Refund estimates use the accepted policy and verified Test amounts already collected. Actual bank refund: ₹0.</p>
    {receipt?<section role="status" className="space-y-3 rounded-md bg-brand-50 p-4"><p>{receipt.visits.length} visit(s) cancelled. Unselected visits are unchanged.</p><p>Test refund requested: {money(receipt.refundMinor)}. This is an obligation, not proof of a completed refund.</p><p className="break-all">Cancellation reference: {receipt.id}</p><p>Track refund status in your booking record. Processing continues even if new payments are disabled.</p></section>:<>
      <fieldset disabled={busy} className="space-y-3"><legend className="mb-3 font-semibold">Choose visits</legend>{record.visits.map(visit=><label key={visit.id} className="flex items-start gap-3 rounded-md border border-border p-4"><input type="checkbox" className="mt-1 size-5" disabled={visit.state!=='confirmed'} checked={selected.includes(visit.id)} onChange={event=>{setSelected(old=>event.target.checked?[...old,visit.id]:old.filter(id=>id!==visit.id));setPreview(null);setAccepted(false);request.current=null;}}/><span>{visit.date} · {visit.slot.replaceAll('_',' ')}<span className="block">{time(visit.startsAt,record.timeZone)} · {visit.state}</span></span></label>)}</fieldset>
      <p className="text-meta">Started visits need operational help. Open your booking record and contact the host; online cancellation will reject a started visit.</p>
      <button disabled={busy||!selected.length} onClick={()=>run()} className="min-h-11 rounded-md border border-border px-4">{busy?'Checking…':'Preview cancellation'}</button>
      {preview?<section className="space-y-4 rounded-md bg-ink-50 p-4"><h2 className="text-h3">Review your cancellation</h2><ul className="space-y-3">{preview.visits.map(v=><li key={v.id}>{v.date} · {v.tier} policy · {Math.round(v.rate*100)}% rent entitlement<br/>Test refund for this visit: {money(v.refundMinor)}</li>)}</ul><p className="font-semibold">Total Test refund requested: {money(preview.refundMinor)}</p><p>Refunds cannot exceed captured amounts. Uncollected deposits and balances are not refunded. Cutoffs are checked again when you confirm.</p><label className="block">Reason (optional)<input disabled={busy} value={reason} onChange={event=>{setReason(event.target.value);request.current=null;}} maxLength={160} className="mt-1 block min-h-11 w-full rounded-md border border-border p-2"/></label><label className="flex gap-3"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)} className="size-5"/><span>I accept this refund estimate and cancellation of only these visits.</span></label><button disabled={busy||!accepted} onClick={()=>run(true)} className="min-h-11 rounded-md bg-brand-700 px-4 text-white">Confirm cancellation</button></section>:null}
    </>}
    {error?<p role="alert" className="rounded-md border border-border p-4">{error}</p>:null}
    <section className="border-t border-border pt-4"><h2 className="text-h3">Need different dates or guests?</h2><p className="mt-2">Visits cannot be edited in place. Review cancellation costs first, then make a new booking at current availability and prices. A replacement is not reserved or guaranteed. For an urgent arrival issue, contact the host from your booking record.</p><nav className="flex flex-wrap gap-5"><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href={`/support/new?order=${record.id}&topic=change`}>Ask about a change</Link><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href={`/support/new?order=${record.id}&topic=cancellation`}>Get cancellation help</Link><Link className="inline-flex min-h-11 items-center text-brand-700 underline" href="/policies/cancellation">Cancellation policy</Link></nav></section>
  </div>;
}
