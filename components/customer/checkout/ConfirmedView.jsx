import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarPlus,
  LifeBuoy,
  MapPin,
  MapPinned,
  PartyPopper,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { CANCELLATION_TIERS } from '@/lib/domain/pricing';
import { formatINRMinor as money } from '@/lib/domain/booking-money';
import { cancellationSteps, clockTime, shortDay } from '@/lib/domain/checkout-display';
import CopyReference from './CopyReference';
import { PriceDetails, SecureNote, StayFacts, StayPhoto, TestBadge } from './parts';

/** A tick that draws itself — the one moment in checkout that earns a flourish. */
function SuccessMark() {
  return (
    <div className="relative mx-auto grid size-20 place-items-center">
      <span
        aria-hidden="true"
        className="animate-ripple absolute inset-0 rounded-full bg-brand-300"
      />
      <svg viewBox="0 0 52 52" className="relative size-20" aria-hidden="true">
        <circle cx="26" cy="26" r="26" className="fill-brand-600" />
        <path
          d="M15 27.5l7 7 15-15"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw"
          style={{ '--draw-length': 32 }}
        />
      </svg>
    </div>
  );
}

export default function ConfirmedView({ data, checkout }) {
  const { quote } = data;
  const first = quote.visits[0];
  const base = `/bookings/${checkout.orderId}`;
  const later = quote.payment.remainingMinor > 0;
  const tier = CANCELLATION_TIERS[quote.policy.cancellationTier];
  const [nextRefund] = first
    ? cancellationSteps(quote.policy.cancellationTier, first.startsAt, checkout.serverNow)
    : [];
  const actions = [
    { href: base, icon: ReceiptText, label: 'View booking', hint: 'Every detail' },
    {
      href: `${base}/calendar`,
      icon: CalendarPlus,
      label: 'Add to calendar',
      hint: '.ics file',
      file: true,
    },
    {
      href: `${base}#getting-there`,
      icon: MapPinned,
      label: 'Arrival details',
      hint: 'Address & host',
    },
    {
      href: `/support/new?order=${checkout.orderId}`,
      icon: LifeBuoy,
      label: 'Get help',
      hint: 'Booking support',
    },
  ];
  const steps = [
    {
      icon: BadgeCheck,
      title: 'Payment verified',
      text: `Your test payment of ${money(quote.payment.expectedMinor)} went through. No real money was charged.`,
    },
    {
      icon: MapPinned,
      title: 'Arrival details unlocked',
      text: 'The address and host contact are now in your booking.',
    },
    {
      icon: Wallet,
      title: later ? 'Remaining amount and deposit' : 'Refundable deposit',
      text: `${later ? `${money(quote.payment.remainingMinor)} is not collected now. ` : ''}The ${money(quote.totals.depositMinor)} refundable deposit is paid separately.`,
    },
    first
      ? {
          icon: PartyPopper,
          title: 'Enjoy your visit',
          text: `${quote.visits.length > 1 ? 'Your first visit starts' : 'Arrive from'} ${clockTime(first.startsAt, quote.timeZone)} on ${shortDay(first.startsAt, quote.timeZone)}.`,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="text-center">
        <SuccessMark />
        <div className="mt-6 flex justify-center">
          <TestBadge />
        </div>
        <h1 className="mt-3 text-h1">You’re all set!</h1>
        <p role="status" className="mt-2 text-body-lg text-ink-600">
          Your test booking at <strong className="font-semibold text-ink-900">{data.title}</strong>{' '}
          is confirmed.
        </p>
        <div className="mt-5 flex justify-center">
          <CopyReference reference={checkout.reference} />
        </div>
      </header>

      <article className="overflow-hidden rounded-2xl border border-border bg-card sm:grid sm:grid-cols-[220px_1fr]">
        <StayPhoto
          photo={data.photo}
          title={data.title}
          sizes="(min-width: 640px) 220px, 100vw"
          className="h-44 sm:h-full sm:min-h-52"
        />
        <div className="p-5 sm:p-6">
          <h2 className="text-h3">{data.title}</h2>
          {data.area ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-600">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {data.area}
            </p>
          ) : null}
          <StayFacts quote={quote} className="mt-5" />
        </div>
      </article>

      <nav aria-label="Manage your booking" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map(({ href, icon: Icon, label, hint, file }) => {
          const tile = (
            <>
              <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-ink-900">{label}</span>
              <span className="block text-xs text-ink-500">{hint}</span>
            </>
          );
          const className =
            'group flex flex-col items-center rounded-2xl border border-border bg-card px-3 py-4 text-center transition hover:border-brand-300 hover:shadow-md';
          return file ? (
            <a key={label} href={href} className={className}>
              {tile}
            </a>
          ) : (
            <Link key={label} href={href} className={className}>
              {tile}
            </Link>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-h4">What happens next</h2>
        <ol className="mt-5">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-10 bottom-1 left-5 w-px bg-brand-200"
                />
              ) : null}
              <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="pt-1.5">
                <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
                <p className="mt-0.5 text-sm text-ink-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid items-start gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <PriceDetails quote={quote} paid />
          <div className="mt-4 border-t border-border pt-4">
            <SecureNote />
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <ShieldCheck className="size-4 text-brand-700" aria-hidden="true" />
            Cancellation
          </h2>
          <p className="mt-3 text-sm text-ink-700">
            {!tier
              ? 'No cancellation policy was set for this booking. Contact support if your plans change.'
              : nextRefund?.rate === 1
                ? `Full rent refund if you cancel before ${shortDay(nextRefund.until, quote.timeZone)}, ${clockTime(nextRefund.until, quote.timeZone)}.`
                : nextRefund?.rate > 0
                  ? `${Math.round(nextRefund.rate * 100)}% rent refund if you cancel before ${shortDay(nextRefund.until, quote.timeZone)}, ${clockTime(nextRefund.until, quote.timeZone)}.`
                  : 'This booking is no longer eligible for a rent refund.'}
          </p>
          {tier ? (
            <p className="mt-2 text-xs text-ink-600">
              {tier.label} policy · counted from each visit’s arrival.
            </p>
          ) : null}
          <Link
            href={`${base}/cancel`}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Manage or cancel visits
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </div>

      <p className="pt-2 text-center">
        <Link
          href="/search"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Explore more places
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}
