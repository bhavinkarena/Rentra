'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function OwnerDestinationTabs({ kind, disputes = false }) {
  const path = usePathname();
  if (process.env.NEXT_PUBLIC_OWNER_V2_NAV === 'false') return null;
  const items =
    kind === 'earnings'
      ? [
          ['/partner/earnings', 'Overview'],
          ['/partner/earnings/statements', 'Statements'],
          ['/partner/payouts', 'Payouts'],
          ['/partner/settings/payout', 'Payout method'],
        ]
      : [
          ['/partner/help', 'Guides'],
          ['/partner/support', 'My requests'],
          ...(disputes ? [['/partner/disputes', 'Disputes']] : []),
        ];
  return (
    <nav
      aria-label={kind === 'earnings' ? 'Earnings sections' : 'Help and support sections'}
      className="mb-5 flex flex-wrap gap-1 border-b border-border"
    >
      {items.map(([href, label]) => {
        const active =
          path === href ||
          (href !== '/partner/earnings' && path.startsWith(href + '/')) ||
          (label === 'Statements' &&
            (path.startsWith('/partner/statements') || path.startsWith('/partner/allocations'))) ||
          (href === '/partner/earnings' && path === '/partner/finance');
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center border-b-2 px-3 text-meta font-semibold ${active ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-600'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
