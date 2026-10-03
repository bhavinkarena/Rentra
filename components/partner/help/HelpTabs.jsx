'use client';
import { usePathname } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
export default function HelpTabs({ disputes = false }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Help and support sections"
      className="mb-7 flex gap-5 overflow-x-auto border-b border-border whitespace-nowrap"
    >
      {[
        ['/partner/help', 'Help centre'],
        ['/partner/support', 'My requests'],
        ['/partner/support/new', 'Contact support'],
        ...(disputes ? [['/partner/disputes', 'Disputes']] : []),
      ].map(([href, label]) => {
        const active =
          href === '/partner/support'
            ? path.startsWith(href) && path !== '/partner/support/new'
            : path === href || (href === '/partner/help' && path.startsWith('/partner/help/'));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-12 items-center border-b-2 px-1 text-meta font-semibold ${active ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-500 hover:text-ink-800'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
