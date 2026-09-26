'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, CalendarDays } from 'lucide-react';
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
      className={`flex items-center gap-1 text-sm font-medium ${compact ? 'max-sm:text-xs' : ''}`}
    >
      {items.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
              ? 'page'
              : undefined
          }
          title={label}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full hover:bg-brand-50 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800 sm:px-3"
        >
          <Icon className="size-4.5" aria-hidden="true" />
          {/* Phones get the icon row; the words return once they fit beside the logo. */}
          <span className="max-sm:sr-only">{label}</span>
        </Link>
      ))}
      {customer ? (
        <Link
          href="/account"
          aria-label="Your account"
          title="Your account"
          aria-current={pathname.startsWith('/account') ? 'page' : undefined}
          className="ml-1 inline-flex size-11 items-center justify-center rounded-full outline-offset-4 hover:ring-2 hover:ring-brand-200"
        >
          <ProfileAvatar name={identity?.name} photoUrl={identity?.photoUrl} />
        </Link>
      ) : (
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-full px-3 hover:bg-brand-50"
        >
          Log in
        </Link>
      )}
    </nav>
  );
}
