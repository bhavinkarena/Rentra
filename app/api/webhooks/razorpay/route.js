import { PAYMENT_RUNTIME } from '@/lib/payments/config';

/** A placeholder must not acknowledge a capture it has not durably processed.
 * Part 21 adds signature verification, durable event ingestion and reconciliation.
 */
export async function POST() {
  return Response.json(
    { error: 'Payment webhook processing is not enabled', code: 'PAYMENTS_DISABLED', mode: PAYMENT_RUNTIME.mode },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
