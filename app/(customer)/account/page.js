import Link from 'next/link';
import {
  CalendarDays,
  Heart,
  Smartphone,
  Bell,
  ShieldCheck,
  CircleHelp,
  ArrowUpRight,
  CreditCard,
  UserRound,
} from 'lucide-react';
import { customerApi } from '@/lib/api/endpoints';
import { ProfileForm, CustomerLogout } from '@/components/customer/AccountForms';
import ProfilePhotoForm from '@/components/customer/ProfilePhotoForm';

export const metadata = { title: 'Account' };
const shortcuts = [
  ['/bookings', CalendarDays, 'Your bookings', 'Upcoming visits, payments and trip details'],
  ['/saved', Heart, 'Saved places', 'Your favourites, ready for your next escape'],
  ['/support', CircleHelp, 'Help & support', 'Get help with a booking or view your requests'],
];
export default async function AccountPage() {
  const account = await customerApi.account();
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Your space on Rentra
          </p>
          <h1 className="text-h1">
            {account.name
              ? `Hello, ${account.name.trim().split(/\s+/)[0]}`
              : 'Make yourself at home'}
          </h1>
          <p className="mt-2 text-ink-600">A little planning. A lot to look forward to.</p>
        </div>
        <Link
          href="/search"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Find your next getaway
          <ArrowUpRight className="size-4" />
        </Link>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {shortcuts.map(([href, Icon, title, description]) => (
          <Link
            href={href}
            key={href}
            className="group rounded-2xl border border-border bg-card p-5 transition hover:border-brand-300 hover:shadow-sm"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="size-5" />
              </span>
              <ArrowUpRight className="size-4 text-ink-400 transition group-hover:text-brand-700" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <UserRound className="size-5 text-brand-700" />
            <h2 className="text-xl font-semibold">Personal details</h2>
          </div>
          <ProfilePhotoForm account={account} />
          <div className="my-7 border-t border-border" />
          <ProfileForm account={account} />
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <Smartphone className="size-5 text-brand-700" />
              <h2 className="font-semibold">Mobile number</h2>
            </div>
            <p className="mt-5 text-lg font-semibold">+91 {account.phone}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-700">
              <ShieldCheck className="size-3.5" />
              Verified for login
            </p>
            <Link
              href="/account/phone"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-brand-50"
            >
              Change number
            </Link>
          </section>
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <h2 className="px-6 pt-6 pb-3 font-semibold">Account settings</h2>
            {[
              ['/account/notifications', Bell, 'Notifications'],
              ['/account/privacy', ShieldCheck, 'Privacy & account'],
              ['/account/payment-methods', CreditCard, 'Payment methods'],
              ['/help', CircleHelp, 'Help & policies'],
            ].map(([href, Icon, title]) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-14 items-center gap-3 px-6 py-3 text-sm hover:bg-brand-50"
              >
                <Icon className="size-4 text-ink-500" />
                {title}
                <ArrowUpRight className="ml-auto size-4 text-ink-400" />
              </Link>
            ))}
          </section>
          <CustomerLogout />
        </aside>
      </div>
    </div>
  );
}
