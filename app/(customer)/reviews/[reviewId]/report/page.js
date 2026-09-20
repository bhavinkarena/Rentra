import { notFound } from 'next/navigation';
import { z } from 'zod';
import { bookingActor } from '@/lib/booking/record-page';
import { sql } from '@/lib/db';
import { ReviewControl } from '@/components/customer/ReviewForms';
export const metadata={title:'Report review',robots:{index:false,follow:false}};
export default async function Report({params}) {
 await bookingActor('customer');const id=(await params).reviewId;
 if(!z.string().uuid().safeParse(id).success)notFound();
 const [review]=await sql`SELECT id,body,owner_reply FROM public_customer_review WHERE id=${id}`;
 if(!review)notFound();
 return <section className="mx-auto max-w-2xl space-y-5 p-4"><h1 className="text-h1">Report review or reply</h1><p className="break-words">{review.body}</p>{review.owner_reply?<p>Owner reply: {review.owner_reply}</p>:null}<p>Tell us which content violates the review rules and why. A report is saved for staff review; it does not automatically remove content.</p><ReviewControl kind="report" id={id}/></section>;
}
