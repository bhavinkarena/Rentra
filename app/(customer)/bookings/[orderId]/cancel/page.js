import { bookingRecordPage } from '@/lib/booking/record-page';
import CancelVisits from '@/components/customer/CancelVisits';
export const metadata={title:'Cancel visits',robots:{index:false,follow:false}};
export default async function CancellationPage({params}) {
  return <CancelVisits record={await bookingRecordPage('customer',(await params).orderId)}/>;
}
