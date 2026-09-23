'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  releaseCustomerCheckout,
  holdCustomerCheckout,
  startCustomerTestPayment,
  verifyCustomerTestPayment,
  customerCheckoutStatus,
  refreshCustomerTestPayment,
} from '@/lib/actions/customer';
import { CANCELLATION_TIERS } from '@/lib/domain/pricing';
import { checkoutMessage, mayLaunchCheckout } from '@/lib/domain/checkout-display';
import { formatINRMinor as money } from '@/lib/domain/booking-money';

const button =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-50';
const errors = {
  INVALID_PURPOSE: 'Enter a visit purpose between 3 and 160 characters.',
  QUOTE_CHANGED:
    'The price, rules or payment settings changed. Return to your dates and review a fresh quote.',
  QUOTE_EXPIRED: 'Your quote expired. Return to your dates for an updated quote.',
  HOLD_EXPIRED: 'Your date hold expired. Check payment status before choosing dates again.',
  AVAILABILITY_CONFLICT:
    'One or more dates are no longer available. Return to your selection to choose another date.',
  GATEWAY_VERSION_CONFLICT:
    'Payment settings changed. Return to your dates and explicitly accept a fresh quote.',
  GATEWAY_CREDENTIALS_MISSING:
    'Test payment is not configured yet. Reload this page to check any recorded booking status.',
  PAYMENTS_DISABLED:
    'Test checkout is currently unavailable. Your existing payment can still be checked.',
  IDEMPOTENCY_CONFLICT:
    'This quote already has a checkout request. Reload this page to recover it.',
};
export default function Checkout({ data }) {
  const { quote, contact } = data;
  const router = useRouter();
  const [checkout, setCheckout] = useState(data.checkout ?? null);
  const [purpose, setPurpose] = useState(data.purpose ?? '');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const gate = useRef(false);
  const sdk = useRef(null);
  const paymentButton = useRef(null);
  const polling = useRef(false);
  const statusSequence = useRef(0);
  const deadline = checkout?.holdExpiresAt
    ? checkout.executionState === 'ready'
      ? new Date(
          Math.min(+new Date(checkout.holdExpiresAt), +new Date(quote.expiresAt)),
        ).toISOString()
      : checkout.holdExpiresAt
    : quote.expiresAt;
  const serverNow = checkout?.serverNow ?? data.serverNow;
  useEffect(() => {
    const end = performance.now() + Math.max(0, new Date(deadline) - new Date(serverNow));
    const tick = () => setRemaining(Math.max(0, Math.ceil((end - performance.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, serverNow]);
  useEffect(() => () => sdk.current?.close(), []);

  function receive(result, sequence) {
    if (sequence !== statusSequence.current) return null;
    if (result.error) {
      setMessage(
        errors[result.code] ??
          `${result.error} Return to your dates if terms changed, or reload to recover an existing checkout.`,
      );
      setAccepted(false);
      return null;
    }
    setCheckout(result.checkout);
    return result.checkout;
  }
  async function checkStatus(reconcile = true) {
    if (!checkout || gate.current) return;
    gate.current = true;
    setBusy(true);
    const sequence = ++statusSequence.current;
    try {
      receive(
        await (reconcile
          ? refreshCustomerTestPayment(checkout.orderId)
          : customerCheckoutStatus(checkout.orderId)),
        sequence,
      );
    } catch {
      setMessage(
        'Status could not be loaded. Keep this link and try again. If your session ended, log in and reopen this checkout.',
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  // Poll persisted state, including webhook confirmation, without starting a payment.
  useEffect(() => {
    if (!checkout || checkout.state !== 'held') return;
    let active = true;
    const timer = setInterval(async () => {
      if (gate.current || polling.current) return;
      polling.current = true;
      const sequence = ++statusSequence.current;
      try {
        const result = await customerCheckoutStatus(checkout.orderId);
        if (active) receive(result, sequence);
      } catch {
        /* Explicit status recovery remains available after a network failure. */
      } finally {
        polling.current = false;
      }
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [checkout]);

  async function submit(event) {
    event.preventDefault();
    if (gate.current || !accepted || remaining <= 0) return;
    gate.current = true;
    setBusy(true);
    setMessage('');
    const sequence = ++statusSequence.current;
    try {
      const result = await holdCustomerCheckout({
        rentableId: quote.selection.rentableId,
        quoteId: quote.id,
        hash: quote.hash,
        version: quote.version,
        accepted: true,
        idempotencyKey: quote.id,
        purpose,
      });
      const held = receive(result, sequence);
      // The quote UUID is a stable request key across reloads and tabs. Persisted ownership is authoritative.
      if (held) router.push(`/checkout/${held.orderId}`);
    } catch {
      setMessage(
        'The request may have reached us. Reload this page to recover its outcome before trying again.',
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function replaceQuote() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    const sequence = ++statusSequence.current;
    try {
      if (receive(await releaseCustomerCheckout(checkout.orderId), sequence))
        router.push(data.listingHref);
    } catch {
      setMessage('Could not release this hold. Check its status before requesting another quote.');
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function pay() {
    if (gate.current || !scriptReady || !mayLaunchCheckout(checkout, remaining)) return;
    gate.current = true;
    setBusy(true);
    setMessage('');
    let opened = false;
    const sequence = ++statusSequence.current;
    try {
      const current = receive(await startCustomerTestPayment(checkout.orderId), sequence);
      if (!current || !mayLaunchCheckout(current, remaining) || !current.providerOrderId) return;
      if (!current.keyId?.startsWith('rzp_test_') || current.environment !== 'test')
        throw new Error('Test checkout required');
      const release = () => {
        gate.current = false;
        setBusy(false);
        requestAnimationFrame(() => paymentButton.current?.focus());
      };
      sdk.current = new window.Razorpay({
        key: current.keyId,
        order_id: current.providerOrderId,
        amount: current.expectedMinor,
        currency: 'INR',
        name: 'Rentra Test',
        description: 'Test booking — no actual bank money',
        prefill: { name: contact.name ?? '', contact: contact.phone ?? '' },
        modal: {
          ondismiss: () => {
            release();
            setMessage(
              'Payment window closed. Check status before retrying. Your date hold keeps its original expiry.',
            );
          },
        },
        handler: async (response) => {
          const verification = ++statusSequence.current;
          setMessage('Checking payment with the server…');
          try {
            receive(
              await verifyCustomerTestPayment({
                orderId: current.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
              verification,
            );
          } catch {
            setMessage(
              'Verification is pending. Use Check payment status; do not start a new booking.',
            );
          } finally {
            release();
          }
        },
      });
      sdk.current.on('payment.failed', () =>
        setMessage(
          'Test payment failed. Retry in the payment window or close it and check status.',
        ),
      );
      sdk.current.open();
      opened = true;
    } catch {
      setMessage('The payment window could not open. Check status, then retry this same checkout.');
    } finally {
      if (!opened) {
        gate.current = false;
        setBusy(false);
      }
    }
  }
  const cancellation = CANCELLATION_TIERS[quote.policy.cancellationTier];
  const confirmed =
    checkout?.state === 'confirmed' &&
    checkout.paymentState === 'succeeded' &&
    !checkout.needsResolution;
  return (
    <div className="space-y-6">
      {checkout?.state === 'held' ? (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onReady={() => setScriptReady(true)}
          onError={() => setScriptFailed(true)}
        />
      ) : null}
      <header>
        <p className="text-meta font-semibold text-brand-700">
          Razorpay Test · ₹0 actual bank money
        </p>
        <h1 className="mt-2 text-h1">
          {confirmed ? 'Test booking confirmed' : 'Your test booking'}
        </h1>
        <p className="mt-2 text-h3">{data.title}</p>
      </header>
      <p className="rounded-md bg-brand-50 p-4">
        This is a sandbox booking. Razorpay Test deducts no actual bank money. Deposit and any
        remaining amount are excluded from this Test collection.
      </p>
      {checkout ? (
        <section className="rounded-md border border-border p-4">
          <h2 className="font-semibold" role="status">
            {checkoutMessage(checkout)}
          </h2>
          <p className="mt-2 break-all text-meta">Reference: {checkout.reference}</p>
          {checkout.state === 'held' ? (
            <p className="mt-2 text-meta">
              Dates held until{' '}
              {new Date(checkout.holdExpiresAt).toLocaleString('en-IN', {
                timeZone: quote.timeZone,
                dateStyle: 'medium',
                timeStyle: 'short',
              })}{' '}
              IST.
            </p>
          ) : null}
          <p className="mt-2 text-meta">
            Keep this page link to recover your booking after login or reload.
          </p>
        </section>
      ) : null}
      {!confirmed && (!checkout || checkout.state === 'held') ? (
        <p role="timer" aria-label="Time remaining">
          {checkout
            ? checkout.executionState === 'ready'
              ? 'Time to start payment'
              : 'Date hold'
            : 'Quote'}
          : {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} remaining
          {remaining === 0 ? ' — refresh status or request a new quote.' : ''}
        </p>
      ) : null}
      <section>
        <h2 className="text-h3">Contact and guests</h2>
        <p className="mt-2">
          {contact.name} · {contact.phone}
        </p>
        <p>
          {quote.selection.guests} guest{quote.selection.guests === 1 ? '' : 's'} for each visit
        </p>
        <Link
          className="inline-flex min-h-11 items-center text-brand-700 underline"
          href="/account"
        >
          Update contact details
        </Link>
        {data.purpose ? <p>Purpose: {data.purpose}</p> : null}
      </section>
      <section>
        <h2 className="text-h3">Your visits</h2>
        <ul className="mt-3 space-y-3">
          {quote.visits.map((visit) => (
            <li className="rounded-md border border-border p-4" key={visit.date}>
              <strong>
                {visit.date} · {visit.slot.replaceAll('_', ' ')}
              </strong>
              <p>
                {new Date(visit.startsAt).toLocaleString('en-IN', { timeZone: quote.timeZone })} –{' '}
                {new Date(visit.endsAt).toLocaleString('en-IN', { timeZone: quote.timeZone })} IST
              </p>
              <p>
                Rent {money(visit.rentMinor)} + fee {money(visit.feeMinor)} ={' '}
                {money(visit.totalMinor)}
              </p>
              <p>Separate deposit: {money(visit.depositMinor)}</p>
              {cancellation ? (
                <ul className="mt-2 text-meta">
                  {cancellation.bands.map(([days, rate]) => (
                    <li key={days}>
                      Cancel at least {days} day(s) before arrival, by{' '}
                      {new Date(
                        new Date(visit.startsAt).getTime() - days * 86400000,
                      ).toLocaleString('en-IN', { timeZone: quote.timeZone })}{' '}
                      IST: {Math.round(rate * 100)}% rent refund (use the earliest eligible cutoff).
                    </li>
                  ))}
                  <li>No-show: no rent refund.</li>
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-meta">Access between separate visits is not included.</p>
      </section>
      <section className="rounded-md bg-ink-50 p-4">
        <h2 className="text-h3">Price and Test collection</h2>
        <dl className="mt-3 space-y-2">
          {Object.entries({
            Rent: quote.totals.rentMinor,
            'Platform fee': quote.totals.feeMinor,
            Total: quote.totals.totalMinor,
            'Test payment now': quote.payment.expectedMinor,
            'Remaining, not collected now': quote.payment.remainingMinor,
            'Refundable deposit, separate': quote.totals.depositMinor,
          }).map(([label, value]) => (
            <div className="flex justify-between gap-4" key={label}>
              <dt>{label}</dt>
              <dd>{money(value)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-meta">
          Collection: {quote.payment.collectionPurpose}. Actual bank money: ₹0.
        </p>
      </section>
      <section>
        <h2 className="text-h3">Rules and cancellation</h2>
        <p className="mt-2">
          Cancellation tier: {quote.policy.cancellationTier ?? 'Not configured'}. The platform fee
          is refundable only with a full flexible-tier rent refund. Cancel eligible unstarted visits
          from your booking record. Test refunds are tracked separately from bank money.
        </p>
        <ul className="mt-2 list-inside list-disc">
          {(Array.isArray(quote.policy.houseRules) ? quote.policy.houseRules : []).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="mt-3 text-meta">
          Policy {quote.policy.version} · listing terms {quote.policy.listingConfigVersion} ·
          payment configuration {quote.payment.version}. No tax has been assumed.
        </p>
      </section>
      {message ? (
        <p role="alert" className="rounded-md border border-border p-4">
          {message}
        </p>
      ) : null}
      {!checkout ? (
        <form onSubmit={submit} className="space-y-4">
          <label className="block font-semibold">
            Purpose of your visit
            <input
              required
              minLength={3}
              maxLength={160}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="For example, a family picnic"
              className="mt-2 block min-h-11 w-full rounded-md border border-border p-3"
            />
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 size-5"
              required
            />
            <span>I accept these visit times, prices, rules and Test collection terms.</span>
          </label>
          {!quote.payment.enabled ? (
            <p>Test checkout is currently disabled. You can still browse dates and prices.</p>
          ) : null}
          <button
            className={button}
            disabled={busy || !accepted || remaining <= 0 || !quote.payment.enabled}
          >
            {' '}
            {busy ? <RentraLoader label="Reserving your dates…" /> : 'Continue to test payment'}
          </button>
          <p className="text-meta">
            This creates a temporary hold. Payment opens on the next screen.
          </p>
        </form>
      ) : (
        <div className="flex flex-wrap gap-3">
          {mayLaunchCheckout(checkout, remaining) ? (
            <button
              ref={paymentButton}
              onClick={pay}
              disabled={busy || !scriptReady}
              className={button}
            >
              {busy ? <RentraLoader label="Checking payment…" /> : 'Continue to test payment'}
            </button>
          ) : null}
          {!confirmed ? (
            <button
              onClick={() => checkStatus()}
              disabled={busy}
              className="min-h-11 rounded-md border border-border px-4"
            >
              {busy ? <RentraLoader label="Checking payment status" /> : 'Check payment status'}
            </button>
          ) : null}
        </div>
      )}
      {checkout ? (
        <Link
          href={`/bookings/${checkout.orderId}`}
          className="inline-flex min-h-11 items-center text-brand-700 underline"
        >
          View booking record and arrival details
        </Link>
      ) : null}
      {scriptFailed ? (
        <p role="alert">
          The payment script could not load. Reload this page to retry; your original booking will
          be recovered.
        </p>
      ) : null}
      {checkout?.state === 'held' && checkout.executionState === 'ready' ? (
        <button
          disabled={busy}
          onClick={replaceQuote}
          className="min-h-11 text-brand-700 underline"
        >
          {busy ? (
            <RentraLoader label="Releasing hold" />
          ) : (
            'Release unpaid hold and review a fresh quote'
          )}
        </button>
      ) : null}
      <Link
        href={data.listingHref}
        className="inline-flex min-h-11 items-center text-brand-700 underline"
      >
        Return to your dates and request a fresh quote
      </Link>
    </div>
  );
}
