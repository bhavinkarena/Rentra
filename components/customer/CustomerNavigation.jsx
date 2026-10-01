'use client';
import Link from '@/components/navigation/NavigationLink';
import { usePathname } from 'next/navigation';
import { Compass, Heart, CalendarDays, CircleUserRound } from 'lucide-react';
import { useSavedPlaces } from './SavedPlacesProvider';
import ProfileAvatar from './ProfileAvatar';

export default function CustomerNavigation({ authenticated = false, compact = false, profile }) {
  const pathname = usePathname();
  const saved = useSavedPlaces();
  const customer = authenticated || saved?.mode === 'customer';
  const identity = saved?.profile ?? profile;
  const items = [
    ['/', 'Explore', Compass],
    ['/saved', 'Saved', Heart],
    ...(customer ? [['/bookings', 'Bookings', CalendarDays]] : []),
  ];
  return (
    <nav
      aria-label="Customer navigation"
      data-customer={customer}
      className={`flex items-center gap-1 text-sm font-medium ${compact ? 'customer-nav--compact max-sm:text-xs' : ''}`}
    >
      {items.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href ||
            (href === '/' && ['/entertainment', '/search'].includes(pathname)) ||
            (href !== '/' && pathname.startsWith(href + '/'))
              ? 'page'
              : undefined
          }
          aria-label={label}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-ink-200 hover:text-brand-800 aria-[current=page]:bg-brand-600 aria-[current=page]:text-white aria-[current=page]:hover:bg-brand-700 motion-reduce:transition-none sm:px-3"
        >
          <Icon className="size-4.5" aria-hidden="true" />
          {/* Phones get the icon row; the words return once they fit beside the logo. */}
          <span className="customer-nav-label max-sm:sr-only sm:ml-2">
            <span>{label}</span>
          </span>
        </Link>
      ))}
      {customer ? (
        <Link
          href="/account"
          aria-label="Your account"
          title="Your account"
          aria-current={
            pathname === '/account' || pathname.startsWith('/account/') ? 'page' : undefined
          }
          className="ml-1 inline-flex size-11 items-center justify-center rounded-full outline-offset-4 hover:ring-2 hover:ring-brand-200"
        >
          <ProfileAvatar name={identity?.name} photoUrl={identity?.photoUrl} />
        </Link>
      ) : (
        <Link
          href="/login"
          aria-label="Log in"
          aria-current={pathname === '/login' ? 'page' : undefined}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 transition-colors duration-150 hover:bg-ink-200 hover:text-brand-800 aria-[current=page]:bg-brand-600 aria-[current=page]:text-white aria-[current=page]:hover:bg-brand-700 motion-reduce:transition-none"
        >
          <CircleUserRound className="size-4.5" aria-hidden="true" />
          <span className="customer-nav-label max-sm:sr-only sm:ml-2">
            <span>Log in</span>
          </span>
        </Link>
      )}
    </nav>
  );
}
