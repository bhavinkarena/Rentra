'use client';
import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { CircleAlert } from 'lucide-react';
import { verifyOwnerRepayment } from '@/lib/actions/partner';
import { formatINRMinor } from '@/lib/domain/booking-money';

// Story 2.18: Test repayment of a recorded owner obligation. Razorpay Test only; no bank money.
export default function RepaymentDue({ data }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  // Kept after a lost verify response so the owner can retry without paying again.
  const [unverified, setUnverified] = useState(null);
  const items = data?.items ?? [];
  const open = items.filter((i) => i.state === 'open');
  const review = items.filter((i) => i.state === 'needs_review');
  if (!open.length && !review.length) return null;
  const verify = async (link, input) => {
    setBusy(link.id);
    try {
      const result = await verifyOwnerRepayment(link.id, input);
      // Not captured yet: keep the response so the owner can check again without paying again.
      setUnverified(result?.paymentStatus === 'pending' ? { link, input } : null);
      setMessage(
        result?.error
          ? result.error
          : result?.state === 'paid'
            ? 'Test repayment received. Thank you.'
            : result?.state === 'needs_review'
              ? 'Payment received; finance is reviewing it. The balance still shows as due.'
              : 'Payment not captured yet. Retry verification in a moment; do not pay again.',
      );
      router.refresh();
    } catch {
      setUnverified({ link, input });
      setMessage('Verification is pending. Retry verification; do not pay again.');
    } finally {
      setBusy('');
    }
  };
  const pay = (link) => {
    if (!data.keyId?.startsWith('rzp_test_')) {
      setMessage('Test payments are not available right now. Try again later.');
      return;
    }
    if (!ready) return;
    setBusy(link.id);
    setMessage('');
    const checkout = new window.Razorpay({
      key: data.keyId,
      order_id: link.providerOrderId,
      amount: Number(link.amountMinor),
      currency: 'INR',
      name: 'Rentra Test',
      description: 'Test repayment — no actual bank money',
      modal: { ondismiss: () => setBusy('') },
      handler: (response) =>
        verify(link, {
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
    });
    checkout.on('payment.failed', () => setMessage('Test payment failed. You can try again.'));
    checkout.open();
  };
  return (
    <section
      aria-labelledby="repayment-due"
      className="space-y-3 rounded-xl border border-warning/30 bg-warning-bg p-4 print:hidden"
    >
      {open.length ? (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setReady(true)}
          onReady={() => setReady(true)}
          onError={() => setMessage('The payment window could not load. Reload to try again.')}
        />
      ) : null}
      <h2 id="repayment-due" className="flex items-center gap-2 text-h3 font-semibold text-ink-900">
        <CircleAlert className="size-4 text-warning" aria-hidden="true" />
        Test repayment due
      </h2>
      <p className="text-meta text-ink-600">
        A guest rent refund was made after your Test payout. Razorpay Test only; no bank money
        moves.
      </p>
      <ul className="divide-y divide-border">
        {[...open, ...review].map((link) => (
          <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-meta">
              {link.bookingRef} · {formatINRMinor(Number(link.amountMinor))} (Test)
            </span>
            {link.state === 'open' ? (
              <button
                type="button"
                disabled={!ready || Boolean(busy)}
                onClick={() => pay(link)}
                className="min-h-11 rounded-md bg-primary px-4 text-white disabled:opacity-50"
              >
                {busy === link.id ? 'Paying…' : 'Pay (Test)'}
              </button>
            ) : (
              <span className="text-tiny text-ink-500">
                Payment received; finance is reviewing it. The balance still shows as due.
              </span>
            )}
          </li>
        ))}
      </ul>
      {message ? (
        <p role="status" className="text-meta">
          {message}
        </p>
      ) : null}
      {unverified ? (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => verify(unverified.link, unverified.input)}
          className="min-h-11 rounded-md border border-border px-4 disabled:opacity-50"
        >
          Retry verification
        </button>
      ) : null}
    </section>
  );
}
