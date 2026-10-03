import Link from '@/components/navigation/NavigationLink';
import { ChevronRight } from 'lucide-react';
import { requireClient } from '@/lib/api/session';
import { settingsSections } from '@/components/partner/settings/sections';
import SettingsHeading from '@/components/partner/settings/SettingsHeading';
export const metadata = {
  title: 'Settings',
  robots: { index: false, follow: false, nocache: true },
};
export default async function Page({ searchParams }) {
  const user = await requireClient(),
    params = await searchParams;
  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('') || 'O';
  return (
    <section>
      {params?.notice === 'verified' && (
        <p role="status" className="mb-5 rounded-md bg-brand-50 p-4 text-meta">
          Your account is already verified. Manage your details in Profile.
        </p>
      )}
      <SettingsHeading
        title="Settings"
        description="Your account and workspace, organised around what you need to manage."
      />
      <div className="flex flex-wrap items-center justify-between gap-5 border-y border-border py-6">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <h2 className="text-h3 font-semibold wrap-break-word">
              {user.name || 'Your owner account'}
            </h2>
            <p className="mt-1 text-meta wrap-break-word text-ink-600">{user.email}</p>
            {user.phone && <p className="mt-1 text-meta text-ink-600">{user.phone}</p>}
          </div>
        </div>
        <Link
          href="/partner/settings/profile"
          className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-800 hover:underline"
        >
          Manage profile
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-9 grid gap-8 xl:grid-cols-2 xl:gap-10">
        {['Account', 'Workspace'].map((group) => (
          <section key={group}>
            <h2 className="mb-4 text-h3 font-semibold">{group}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {settingsSections
                .filter((s) => s.group === group)
                .map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className="flex min-h-24 items-center justify-between gap-5 p-5 hover:bg-ink-25 sm:p-6"
                    >
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-ink-900">
                          {s.title}
                        </span>
                        <span className="mt-2 block text-meta leading-6 text-ink-600">
                          {s.description}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 text-meta text-ink-600">
        Need help with your account?{' '}
        <Link
          href="/partner/support/new?category=account"
          className="ml-1 inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
        >
          Contact support
        </Link>
      </p>
    </section>
  );
}
