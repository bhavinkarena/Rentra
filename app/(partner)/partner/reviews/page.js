import { bookingActor } from '@/lib/booking/record-page';
import { reviewQueue } from '@/lib/reviews/service';
import { sql } from '@/lib/db';
import ReviewQueue from '@/components/customer/ReviewQueue';
export const metadata={title:'Customer reviews',robots:{index:false,follow:false}};
export default async function Page({searchParams}) {
 const actor=await bookingActor('owner');
 return <ReviewQueue admin={false} data={await reviewQueue(sql,actor,(await searchParams)?.page)}/>;
}
