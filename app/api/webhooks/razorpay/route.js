import crypto from 'node:crypto';
import { razorpayWebhookSchema } from '@/lib/validation/zod';

/**
 * A route handler exists here because Razorpay is an EXTERNAL caller.
 * This is the correct use of /api/* — not for our own frontend, which reads
 * through Server Components and writes through Server Actions.
 *
 * Order matters: verify the signature FIRST, then validate the shape.
 * Never trust the body before the HMAC checks out.
 */
export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return Response.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const parsed = razorpayWebhookSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return Response.json({ error: 'Unexpected payload' }, { status: 400 });
  }

  const { event, payload } = parsed.data;

  switch (event) {
    case 'payment.captured':
      // TODO: mark booking advance_paid, notify Client on WhatsApp,
      // start the 12-hour acceptance timer in the worker.
      break;
    case 'payment.failed':
      // TODO: release the held slot so the calendar reopens immediately.
      break;
    case 'refund.processed':
      // TODO: close the cancellation record.
      break;
    default:
      break;
  }

  // Always 200 once handled, or Razorpay retries.
  return Response.json({ received: true, event });
}
