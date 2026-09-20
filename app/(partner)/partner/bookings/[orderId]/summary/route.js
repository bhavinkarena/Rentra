import { bookingSummaryResponse } from '@/lib/booking/record-download';
export async function GET(request, { params }) {
  return bookingSummaryResponse('owner', (await params).orderId);
}
