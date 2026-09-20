import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bookingActor } from '@/lib/booking/record-page';
import { sql } from '@/lib/db';
import { reviewOrder } from '@/lib/reviews/service';
import { CustomerReviewForm } from '@/components/customer/ReviewForms';
export const metadata={title:'Review your visit',robots:{index:false,follow:false}};
export default async function Reviews({params}) {
 const actor=await bookingActor('customer');let data;
 try {data=await reviewOrder(sql,actor.session,(await params).orderId);} catch(e){if(e.code==='NOT_FOUND'||e.name==='ZodError')notFound();throw e;}
 const eligible=data.visits.filter(v=>v.eligible&&!v.review_id);
 return <section className="mx-auto max-w-2xl space-y-5 p-4"><Link className="underline" href={`/bookings/${data.id}`}>Back to booking</Link><h1 className="text-h1">Review your visit</h1>
 <p>Reviews require a real completed visit with recorded handover, return and completion. Cancelled, incomplete and simulation visits cannot be reviewed.</p>
 {eligible.length?<CustomerReviewForm visits={eligible}/>:<p>No unreviewed eligible visits in this booking.</p>}
 <ul className="space-y-4">{data.visits.filter(v=>v.review_id).map(v=><li key={v.id} className="rounded border border-border p-4"><h2 className="font-semibold">{v.date} · {v.rating} out of 5</h2><p>Status: {v.moderation_state}</p><p className="whitespace-pre-wrap break-words">{v.body}</p>{v.moderation_reason?<p>Moderation reason: {v.moderation_reason}</p>:null}</li>)}</ul></section>;
}
