import { Smartphone, ShieldCheck } from 'lucide-react';
import { BackLink } from '@/components/ui/page-header';
import { customerApi } from '@/lib/api/endpoints';
import { PhoneChangeForm } from '@/components/customer/AccountForms';
export const metadata = { title: 'Change mobile number' };
export default async function PhonePage() {
  const account = await customerApi.account();
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/account" className="mb-4">
        Account
      </BackLink>
      <div className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-[0.8fr_1.2fr]">
        <aside className="bg-brand-50 p-7 sm:p-8">
          <span className="mb-6 grid size-14 place-items-center rounded-lg bg-white text-brand-700">
            <Smartphone className="size-7" />
          </span>
          <h1 className="text-h2">
            A new number.
            <br />
            The same you.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            Keep your bookings and saved places. Just update the number you use to log in.
          </p>
          <div className="mt-8 border-t border-brand-200 pt-5">
            <p className="text-xs text-ink-500">Current number</p>
            <p className="mt-1 font-semibold">+91 {account.phone}</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-brand-700">
              <ShieldCheck className="size-4" />
              Verified
            </p>
          </div>
        </aside>
        <section className="p-7 sm:p-8">
          <h2 className="mb-2 text-h3">Change mobile number</h2>
          <p className="mb-7 text-sm text-ink-500">Verify your new number to finish the change.</p>
          <PhoneChangeForm />
          <p className="mt-6 rounded-md bg-ink-50 p-4 text-meta leading-relaxed text-ink-600">
            After verification, your other sessions will be signed out. Your bookings and account
            details stay with you.
          </p>
        </section>
      </div>
    </div>
  );
}
