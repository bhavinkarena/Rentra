'use client';
import Link from '@/components/navigation/NavigationLink';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Heart, CalendarDays, CircleUserRound } from 'lucide-react';
import { useSavedPlaces } from './SavedPlacesProvider';
import AccountSwitchButton from '@/components/auth/AccountSwitchButton';
import ProfileAvatar from './ProfileAvatar';

export default function CustomerNavigation({ authenticated = false, compact = false, profile }) {
  const pathname = usePathname();
  const saved = useSavedPlaces();
  const customer = authenticated || saved?.mode === 'customer';
  const identity = saved?.profile ?? profile;
  const items = [
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
          aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
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
      ) : pathname === '/search' ? (
        <Suspense fallback={<LogInButton />}>
          <SearchLogIn />
        </Suspense>
      ) : (
        <LogInButton />
      )}
    </nav>
  );
}

const logInClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 transition-colors duration-150 hover:bg-ink-200 hover:text-brand-800 aria-[current=page]:bg-brand-600 aria-[current=page]:text-white aria-[current=page]:hover:bg-brand-700 motion-reduce:transition-none';
const logInLabel = (
  <>
    <CircleUserRound className="size-4.5" aria-hidden="true" />
    <span className="customer-nav-label max-sm:sr-only sm:ml-2">
      <span>Log in</span>
    </span>
  </>
);

function LogInButton() {
  return (
    <AccountSwitchButton role="customer" ariaLabel="Log in" className={logInClass}>
      {logInLabel}
    </AccountSwitchButton>
  );
}

/** Story 3.1: a guest signing in from search returns to the identical search. */
function SearchLogIn() {
  const query = new URLSearchParams(useSearchParams());
  query.delete('dropped');
  const params = query.toString();
  const next = params ? `/search?${params}` : '/search';
  return (
    <Link
      href={`/login?next=${encodeURIComponent(next)}`}
      aria-label="Log in"
      className={logInClass}
    >
      {logInLabel}
    </Link>
  );
}
