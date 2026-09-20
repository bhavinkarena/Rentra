import { bookingSummaryResponse } from '@/lib/booking/record-download';
export async function GET(request, { params }) {
  return bookingSummaryResponse('customer', (await params).orderId, true);
}
