import { bookingSummaryResponse } from '@/lib/booking/record-download';
export async function GET(request, { params }) {
  return bookingSummaryResponse('admin', (await params).orderId, true);
}
