import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, UserRound } from 'lucide-react';
import { customerApi, bookingApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { ProfileForm } from '@/components/customer/AccountForms';
import Checkout from '@/components/customer/Checkout';
import {
  PropertyHeader,
  Stepper,
  SummaryCard,
  TestBadge,
} from '@/components/customer/checkout/parts';
export const metadata = { title: 'Confirm your test booking' };
export default async function CheckoutReviewPage({ params }) {
  const account = await customerApi.account();
  const { quoteId } = await params;
  let data;
  try {
    data = await bookingApi.reviewQuote(quoteId);
  } catch (error) {
    /* A malformed or unknown quote is the same dead end to the guest. */
    if (error instanceof ApiError && [400, 404, 422].includes(error.status)) notFound();
    throw error;
  }
  if (data.existingOrderId) redirect(`/checkout/${data.existingOrderId}`);
  if (!account.complete)
    return (
      <div>
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
        <h1 className="mt-2 text-h2 sm:text-h1">Confirm your booking</h1>
        <div className="mt-4">
          <Stepper current={0} />
        </div>
        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <aside className="hidden lg:col-start-2 lg:row-start-1 lg:block">
            <SummaryCard data={data} />
          </aside>
          <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
            <PropertyHeader data={data} className="lg:hidden" />
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
              <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
                <UserRound className="size-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-h3">What should we call you?</h2>
              <p className="mt-2 mb-6 text-sm text-ink-600">
                Add your name for this booking. Your selected dates stay here while you finish your
                profile.
              </p>
              <ProfileForm account={account} />
            </section>
          </div>
        </div>
      </div>
    );
  return <Checkout key={quoteId} data={data} />;
}
