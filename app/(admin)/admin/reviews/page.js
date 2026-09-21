import { adminApi } from '@/lib/api/endpoints';
import AdminReviewQueue from '@/components/admin/AdminReviewQueue';
export const metadata={title:'Customer reviews',robots:{index:false,follow:false}};
export default async function Page({searchParams}) {
 return <AdminReviewQueue data={await adminApi.reviews({page:(await searchParams)?.page})}/>;
}
