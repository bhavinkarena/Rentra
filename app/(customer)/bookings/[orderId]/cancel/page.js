import { customerApi } from '@/lib/api/endpoints';
import CancelVisits from '@/components/customer/CancelVisits';
export const metadata={title:'Cancel visits',robots:{index:false,follow:false}};
export default async function CancellationPage({params}) {
  return <CancelVisits record={await customerApi.record((await params).orderId)}/>;
}
