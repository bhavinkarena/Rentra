'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import { settingsSections } from './settings/sections';
export default function SettingsTabs() {
  const path = usePathname(),
    router = useRouter();
  return (
    <nav aria-label="Settings pages" className="lg:sticky lg:top-24">
      <label className="block text-meta font-semibold lg:hidden">
        Settings section
        <select
          className="mt-2 min-h-12 w-full rounded-md border border-input bg-card px-3 text-base"
          value={
            settingsSections.find((s) => path.startsWith(s.href))?.href ||
            '/partner/settings/profile'
          }
          onChange={(e) => router.push(e.target.value)}
        >
          {settingsSections.map((s) => (
            <option key={s.href} value={s.href}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <ul className="hidden space-y-1 lg:block">
        {settingsSections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              aria-current={path.startsWith(s.href) ? 'page' : undefined}
              className="flex min-h-12 items-center rounded-md px-3 text-meta font-semibold text-ink-600 hover:bg-ink-50 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800"
            >
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
