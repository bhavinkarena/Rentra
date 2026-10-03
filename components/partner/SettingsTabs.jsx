'use client';
import { usePathname } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
export default function SettingsTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Settings pages" className="flex flex-wrap gap-2">
      {[
        ['/partner/settings', 'Profile'],
        ['/partner/settings/security', 'Login & security'],
        ['/partner/settings/notifications', 'Notifications'],
        ['/partner/settings/calendar-sync', 'Calendar sync'],
        ['/partner/settings/privacy', 'Privacy'],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? 'page' : undefined}
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-3 font-semibold underline aria-[current=page]:border-ink-900 aria-[current=page]:bg-ink-900 aria-[current=page]:text-white aria-[current=page]:no-underline"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
