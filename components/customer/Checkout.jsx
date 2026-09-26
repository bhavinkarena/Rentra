'use client';
import RentraLoader from '@/components/ui/rentra-loader';
import CheckboxCard from '@/components/ui/checkbox-card';

import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  CircleAlert,
  CircleX,
  CreditCard,
  Hourglass,
  Landmark,
  Lock,
  MessageSquareText,
  Phone,
  ReceiptText,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Timer,
  TriangleAlert,
  Undo2,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  releaseCustomerCheckout,
  holdCustomerCheckout,
  startCustomerTestPayment,
  verifyCustomerTestPayment,
  customerCheckoutStatus,
  refreshCustomerTestPayment,
} from '@/lib/actions/customer';
import { BOOKING_POLICY } from '@/lib/domain/booking-policy';
import { checkoutStage, mayLaunchCheckout } from '@/lib/domain/checkout-display';
import { formatINRMinor as money } from '@/lib/domain/booking-money';
import ConfirmedView from './checkout/ConfirmedView';
import {
  CancellationPolicy,
  HoldTimer,
  HouseRules,
  PriceDetails,
  PropertyHeader,
  Section,
  SecureNote,
  StatusBanner,
  StayFacts,
  Stepper,
  SummaryCard,
  TermsVersion,
  TestBadge,
  VisitList,
} from './checkout/parts';

const primary =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50';
const textLink =
  'inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline disabled:opacity-50';
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
const STAGES = {
  held: {
    tone: 'brand',
    icon: CalendarCheck,
    title: 'Your dates are held',
    text: 'Complete the test payment before the timer ends to confirm your booking.',
  },
  failed: {
    tone: 'danger',
    icon: CircleX,
    title: 'Payment didn’t go through',
    text: 'Your dates are still held. You can retry within the remaining time.',
  },
  pending: {
    tone: 'info',
    icon: Hourglass,
    title: 'We’re confirming your payment',
    text: 'This can take a moment. Check the status before trying again — don’t pay twice.',
  },
  timeUp: {
    tone: 'warning',
    icon: Timer,
    title: 'Time’s up',
    text: 'The hold ran out. If you already paid, check the payment status first; otherwise choose your dates again.',
  },
  expired: {
    tone: 'warning',
    icon: CalendarX,
    title: 'This date hold has ended',
    text: 'Check the payment status before starting again.',
  },
  cancelled: {
    tone: 'neutral',
    icon: CircleX,
    title: 'This booking is cancelled',
    text: 'See each visit and any test refund in your booking record.',
  },
  booked: {
    tone: 'neutral',
    icon: ReceiptText,
    title: 'This booking has updates',
    text: 'See each visit’s current status in your booking record.',
  },
  resolution: {
    tone: 'warning',
    icon: TriangleAlert,
    title: 'Payment arrived after the dates became unavailable',
    text: 'A test refund was requested and your visits are not confirmed. Check the refund status in your booking record.',
  },
};
const PAYING = ['held', 'failed', 'pending', 'timeUp'];
const PURPOSES = [
  'Family picnic',
  'Birthday party',
  'Friends get-together',
  'Corporate outing',
  'Pool day',
  'Pre-wedding shoot',
];
const PAYMENT_METHODS = [
  ['UPI', Smartphone],
  ['Cards', CreditCard],
  ['Netbanking', Landmark],
];

function displayPhone(phone) {
  return /^\+91\d{10}$/.test(phone ?? '') ? `+91 ${phone.slice(3, 8)} ${phone.slice(8)}` : phone;
}

export default function Checkout({ data }) {
  const { quote, contact } = data;
  const router = useRouter();
  const [checkout, setCheckout] = useState(data.checkout ?? null);
  const [purpose, setPurpose] = useState(data.purpose ?? '');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  // Which action is in flight: 'hold' | 'status' | 'release' | 'pay'.
  const [busyAction, setBusyAction] = useState('');
  const busy = Boolean(busyAction);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const deadline = checkout?.holdExpiresAt
    ? checkout.executionState === 'ready'
      ? new Date(
          Math.min(+new Date(checkout.holdExpiresAt), +new Date(quote.expiresAt)),
        ).toISOString()
      : checkout.holdExpiresAt
    : quote.expiresAt;
  const serverNow = checkout?.serverNow ?? data.serverNow;
  // Seeded from the server's own clock so the first paint and hydration agree.
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((new Date(deadline) - new Date(serverNow)) / 1000)),
  );
  const [barShown, setBarShown] = useState(false);
  const gate = useRef(false);
  const sdk = useRef(null);
  const paymentButton = useRef(null);
  const polling = useRef(false);
  const statusSequence = useRef(0);
  const actionCard = useRef(null);
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
    setBusyAction('status');
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
      setBusyAction('');
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
    setBusyAction('hold');
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
      setBusyAction('');
    }
  }
  async function replaceQuote() {
    if (gate.current) return;
    gate.current = true;
    setBusyAction('release');
    const sequence = ++statusSequence.current;
    try {
      if (receive(await releaseCustomerCheckout(checkout.orderId), sequence))
        router.push(data.listingHref);
    } catch {
      setMessage('Could not release this hold. Check its status before requesting another quote.');
    } finally {
      gate.current = false;
      setBusyAction('');
    }
  }
  async function pay() {
    if (gate.current || !scriptReady || !mayLaunchCheckout(checkout, remaining)) return;
    gate.current = true;
    setBusyAction('pay');
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
        setBusyAction('');
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
        timeout: remaining,
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
        setBusyAction('');
      }
    }
  }

  const stage = checkoutStage(checkout, remaining);
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const canPay = mayLaunchCheckout(checkout, remaining);
  const review = stage === 'review';
  const payNow = money(checkout?.expectedMinor ?? quote.payment.expectedMinor);
  // Phones get a sticky action bar while the in-page action is scrolled away.
  const withBar = review || canPay;
  useEffect(() => {
    const element = actionCard.current;
    if (!withBar || !element) return;
    const observer = new IntersectionObserver(([entry]) => setBarShown(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [withBar]);

  if (stage === 'confirmed') return <ConfirmedView data={data} checkout={checkout} />;

  const holdTimer =
    review || PAYING.includes(stage) ? (
      <HoldTimer
        label={
          review
            ? 'Price held for'
            : checkout.executionState === 'ready'
              ? 'Start payment within'
              : 'Dates held for'
        }
        remaining={remaining}
      />
    ) : null;
  // Timer roles are silent by design; say it out loud twice before time runs out.
  const warning =
    holdTimer && remaining > 0 && remaining <= 120
      ? `${remaining <= 60 ? 'Less than 1 minute' : 'Less than 2 minutes'} left to ${review ? 'continue with this price' : 'complete your payment'}.`
      : '';

  const banner = STAGES[stage];
  const alert = message ? (
    <p
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-bg p-4 text-sm text-ink-900"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
      {message}
    </p>
  ) : null;
  const statusButton = (
    <button type="button" onClick={() => checkStatus()} disabled={busy} className={secondary}>
      {busyAction === 'status' ? (
        <RentraLoader label="Checking payment status" />
      ) : (
        <RefreshCw className="size-4" aria-hidden="true" />
      )}
      Check payment status
    </button>
  );
  const recordLink = checkout ? (
    <Link href={`/bookings/${checkout.orderId}`} className={textLink}>
      <ReceiptText className="size-4" aria-hidden="true" />
      View booking record
    </Link>
  ) : null;
  const datesLink = (
    <Link href={data.listingHref} className={`${primary} text-sm`}>
      <CalendarDays className="size-4" aria-hidden="true" />
      Choose dates again
    </Link>
  );

  return (
    <div className={withBar ? 'pb-28 lg:pb-0' : ''}>
      {checkout?.state === 'held' ? (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setScriptReady(true)}
          onReady={() => setScriptReady(true)}
          onError={() => setScriptFailed(true)}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={data.listingHref}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-700 hover:text-brand-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to {data.title}
        </Link>
        <TestBadge />
      </div>
      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 sm:text-h1">
            {review
              ? 'Confirm your booking'
              : PAYING.includes(stage)
                ? 'Complete your payment'
                : 'Your test booking'}
          </h1>
          {review || PAYING.includes(stage) ? (
            <div className="mt-4">
              <Stepper current={review ? 0 : 1} />
            </div>
          ) : null}
        </div>
        {holdTimer ? <div className="lg:hidden">{holdTimer}</div> : null}
      </header>

      <p className="sr-only" aria-live="polite">
        {warning}
      </p>
      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <aside className="hidden lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:block">
          <SummaryCard data={data} timer={holdTimer} />
        </aside>
        <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
          <PropertyHeader data={data} className="lg:hidden" />

          {banner ? (
            <StatusBanner tone={banner.tone} icon={banner.icon} title={banner.title}>
              {banner.text}
            </StatusBanner>
          ) : null}

          {PAYING.includes(stage) ? (
            <section
              ref={actionCard}
              aria-labelledby="pay-heading"
              className="rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="pay-heading" className="text-h4">
                  {canPay ? 'Pay securely' : 'Payment status'}
                </h2>
                <p className="text-sm text-ink-600">
                  Due now{' '}
                  <strong className="text-base text-ink-900 tabular" data-money>
                    {payNow}
                  </strong>
                </p>
              </div>
              {canPay ? (
                <ul aria-label="Payment options" className="mt-3 flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(([label, Icon]) => (
                    <li
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-700"
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                  <li className="inline-flex items-center px-1 text-xs text-ink-500">
                    via Razorpay
                  </li>
                </ul>
              ) : null}
              {alert ? <div className="mt-4">{alert}</div> : null}
              {canPay ? (
                <button
                  ref={paymentButton}
                  onClick={pay}
                  disabled={busy || !scriptReady}
                  className={`${primary} mt-5 w-full text-base`}
                >
                  {busyAction === 'pay' ? (
                    <>
                      <RentraLoader inverse label="Checking payment…" />
                      Opening payment…
                    </>
                  ) : scriptReady ? (
                    <>
                      <Lock className="size-4" aria-hidden="true" />
                      {stage === 'failed' ? `Retry payment of ${payNow}` : `Pay ${payNow}`}
                    </>
                  ) : (
                    <>
                      <RentraLoader inverse label="Loading secure payment" />
                      Loading secure payment…
                    </>
                  )}
                </button>
              ) : null}
              {canPay ? (
                <p className="mt-2 text-center text-xs text-ink-500">
                  Opens Razorpay’s secure payment window.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {statusButton}
                {stage === 'timeUp' ? datesLink : null}
                {checkout.state === 'held' &&
                checkout.executionState === 'ready' &&
                stage !== 'timeUp' ? (
                  <button type="button" disabled={busy} onClick={replaceQuote} className={textLink}>
                    {busyAction === 'release' ? (
                      <RentraLoader label="Releasing hold" />
                    ) : (
                      <Undo2 className="size-4" aria-hidden="true" />
                    )}
                    Release hold and change dates
                  </button>
                ) : null}
              </div>
              <p className="mt-4 text-xs text-ink-600">
                Paid already but still seeing this? Check the payment status first so you don’t pay
                twice. You can reload this page anytime — your hold is saved.
              </p>
            </section>
          ) : null}

          {!review && !PAYING.includes(stage) ? (
            <div className="flex flex-wrap items-center gap-3">
              {stage === 'expired' ? datesLink : null}
              {['expired', 'resolution'].includes(stage) ? statusButton : null}
              {recordLink}
            </div>
          ) : null}
          {!review && !PAYING.includes(stage) ? alert : null}

          <Section
            icon={CalendarDays}
            title="Your trip"
            action={
              review ? (
                <Link href={data.listingHref} className={textLink}>
                  Edit
                </Link>
              ) : null
            }
          >
            <StayFacts quote={quote} row />
            {quote.visits.length > 1 ? (
              <div className="mt-5 border-t border-border pt-5">
                <VisitList quote={quote} />
              </div>
            ) : null}
          </Section>

          <Section icon={Wallet} title="Price details" className="lg:hidden">
            <PriceDetails quote={quote} titled={false} />
            <div className="mt-4 border-t border-border pt-4">
              <SecureNote />
            </div>
          </Section>

          <Section
            icon={UserRound}
            title="Contact details"
            action={
              <Link href="/account" className={textLink}>
                Edit
              </Link>
            }
          >
            <ul className="space-y-2.5 text-sm text-ink-800">
              <li className="flex items-center gap-3">
                <UserRound className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                {contact.name || 'Name not added'}
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                {displayPhone(contact.phone) || 'Mobile number not added'}
              </li>
              {!review && data.purpose ? (
                <li className="flex items-center gap-3">
                  <MessageSquareText className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                  {data.purpose}
                </li>
              ) : null}
            </ul>
          </Section>

          <Section icon={ShieldCheck} title="Cancellation policy">
            <CancellationPolicy quote={quote} now={serverNow} />
          </Section>

          <Section icon={ScrollText} title="House rules">
            <HouseRules rules={quote.policy.houseRules} />
            <TermsVersion quote={quote} />
          </Section>

          {review ? (
            <form
              id="checkout-form"
              ref={actionCard}
              onSubmit={submit}
              aria-labelledby="confirm-heading"
              className="rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <h2 id="confirm-heading" className="text-h4">
                Confirm and book
              </h2>
              <label htmlFor="checkout-purpose" className="mt-5 block text-sm font-semibold">
                Purpose of your visit
              </label>
              <div role="group" aria-label="Quick picks" className="mt-2.5 flex flex-wrap gap-2">
                {PURPOSES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={purpose === option}
                    onClick={() => setPurpose(option)}
                    className="min-h-10 rounded-full border border-ink-300 bg-card px-3.5 text-sm text-ink-700 transition-colors hover:border-brand-500 aria-pressed:border-brand-600 aria-pressed:bg-brand-600 aria-pressed:font-semibold aria-pressed:text-white"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <input
                id="checkout-purpose"
                required
                minLength={3}
                maxLength={160}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Or type your own"
                aria-describedby="checkout-purpose-count"
                className="mt-3 block min-h-12 w-full rounded-xl border border-ink-300 bg-card px-4 text-sm outline-none focus:border-brand-600"
              />
              <p id="checkout-purpose-count" className="mt-1.5 text-right text-xs text-ink-500">
                {purpose.length}/160
              </p>
              <CheckboxCard
                className="mt-5"
                checked={accepted}
                onCheckedChange={setAccepted}
                required
              >
                <span className="block font-semibold text-ink-900">
                  I agree to these booking terms
                </span>
                <span className="mt-0.5 block text-ink-600">
                  The visit times, price, cancellation policy and house rules above, and a{' '}
                  <span data-money>{money(quote.totals.depositMinor)}</span> refundable deposit paid
                  separately.
                </span>
              </CheckboxCard>
              {!quote.payment.enabled ? (
                <p className="mt-4 rounded-xl bg-warning-bg p-3.5 text-sm text-ink-900">
                  Test checkout is currently disabled. You can still browse dates and prices.
                </p>
              ) : null}
              {alert ? <div className="mt-4">{alert}</div> : null}
              <button
                className={`${primary} mt-5 w-full text-base`}
                disabled={busy || remaining <= 0 || !quote.payment.enabled}
              >
                {busy ? (
                  <>
                    <RentraLoader inverse label="Reserving your dates…" />
                    Reserving your dates…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" aria-hidden="true" />
                    Continue to payment
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-ink-600">
                {remaining <= 0
                  ? 'This price expired. Go back to your dates for a fresh quote.'
                  : `We hold your dates for up to ${BOOKING_POLICY.holdMinutes} minutes while you pay on the next step. You won’t be charged yet.`}
              </p>
            </form>
          ) : null}

          {scriptFailed ? (
            <p role="alert" className="rounded-xl border border-danger/25 bg-danger-bg p-4 text-sm">
              The payment script could not load. Reload this page to retry; your original booking
              will be recovered.
            </p>
          ) : null}
        </div>
      </div>

      {withBar ? (
        <div
          aria-hidden={!barShown}
          inert={!barShown}
          className={`fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden ${barShown ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0">
              <p className="text-h4 font-extrabold tabular" data-money>
                {payNow}
              </p>
              <p className="truncate text-xs text-ink-600">
                Due now · total {money(quote.totals.totalMinor)}
                {remaining > 0 ? ` · ${clock} left` : ''}
              </p>
            </div>
            {review ? (
              <button
                type="submit"
                form="checkout-form"
                disabled={busy || remaining <= 0 || !quote.payment.enabled}
                className={`${primary} ml-auto shrink-0`}
              >
                <Lock className="size-4" aria-hidden="true" />
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={pay}
                disabled={busy || !scriptReady}
                className={`${primary} ml-auto shrink-0`}
              >
                <Lock className="size-4" aria-hidden="true" />
                Pay {payNow}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
