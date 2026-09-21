import { partnerApi } from '@/lib/api/endpoints';
import ReviewQueue from '@/components/customer/ReviewQueue';
export const metadata={title:'Customer reviews',robots:{index:false,follow:false}};
export default async function Page({searchParams}) {
 return <ReviewQueue admin={false} data={await partnerApi.reviews({page:(await searchParams)?.page})}/>;
}
