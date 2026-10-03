'use client';

import { usePathname } from 'next/navigation';
import Skeleton from '@/components/ui/skeleton';
import ScreenSkeleton from '@/components/loading/ScreenSkeleton';
import { DashboardSkeleton } from '@/components/partner/PartnerLoading';
import BookingsLoading from '@/app/(partner)/partner/bookings/loading';
import CalendarLoading from '@/app/(partner)/partner/calendar/loading';
import DisputesLoading from '@/app/(partner)/partner/disputes/loading';
import FinanceLoading from '@/app/(partner)/partner/finance/loading';
import ListingsLoading from '@/app/(partner)/partner/listings/loading';
import OnboardingLoading from '@/app/(partner)/partner/onboarding/loading';
import PayoutsLoading from '@/app/(partner)/partner/payouts/loading';
import ReviewsLoading from '@/app/(partner)/partner/reviews/loading';
import SettingsLoading from '@/app/(partner)/partner/settings/loading';
import SupportLoading from '@/app/(partner)/partner/support/loading';
import TeamLoading from '@/app/(partner)/partner/team/loading';
import UpdatesLoading from '@/app/(partner)/partner/updates/loading';
import LoginLoading from '@/app/(partner)/partner/login/loading';

// Same skeleton the route itself shows once the layout has resolved, so nothing jumps.
const ROUTES = {
  bookings: BookingsLoading,
  calendar: CalendarLoading,
  disputes: DisputesLoading,
  finance: FinanceLoading,
  listings: ListingsLoading,
  onboarding: OnboardingLoading,
  payouts: PayoutsLoading,
  reviews: ReviewsLoading,
  settings: SettingsLoading,
  support: SupportLoading,
  team: TeamLoading,
  updates: UpdatesLoading,
};

const onDark = { background: 'rgb(255 255 255 / 0.1)' };
const darkSweep = { '--skeleton-highlight': 'rgb(255 255 255 / 0.06)' };

/**
 * First-load fallback for the whole owner area. It sits above the partner layout,
 * so it draws the shell (sidebar, header, phone bar) itself and fills it with the
 * route's own skeleton.
 */
export default function PartnerShellSkeleton() {
  const pathname = usePathname() ?? '/partner';
  if (pathname.startsWith('/partner/login')) return <LoginLoading />;
  const segment = pathname.match(/^\/partner\/([^/]+)\/?$/)?.[1];
  const Route =
    pathname === '/partner' || pathname === '/partner/' ? DashboardSkeleton : ROUTES[segment];
  return (
    <div className="portal-ui owner-portal min-h-dvh bg-ink-25 md:flex">
      <aside
        aria-hidden="true"
        style={darkSweep}
        className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col bg-sidebar px-3 py-4 md:flex"
      >
        <div className="flex items-center justify-between px-2">
          <div>
            <Skeleton className="h-6 w-24" style={onDark} />
            <Skeleton className="mt-2 h-4 w-16 rounded-full" style={onDark} />
          </div>
          <Skeleton className="size-5" style={onDark} />
        </div>
        <Skeleton className="mt-8 ml-2 h-3 w-20" style={onDark} />
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-11 w-full" style={onDark} />
          ))}
        </div>
        <Skeleton className="mt-6 ml-2 h-3 w-12" style={onDark} />
        <div className="mt-3 space-y-2">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-11 w-full" style={onDark} />
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <Skeleton className="size-9 rounded-full" style={onDark} />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-24" style={onDark} />
            <Skeleton className="mt-2 h-3 w-20" style={onDark} />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div
          aria-hidden="true"
          className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-card px-4 py-2 sm:px-6 lg:min-h-14"
        >
          <Skeleton className="h-11 min-w-0 flex-1 sm:max-w-xl" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="hidden h-11 w-20 md:block" />
            <Skeleton className="size-11" />
            <Skeleton className="size-11 rounded-full" />
          </div>
        </div>
        <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {Route ? (
            <Route />
          ) : (
            <ScreenSkeleton layout="portal" screen="table" label="Loading your workspace" />
          )}
        </main>
      </div>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex flex-col items-center gap-1.5">
            <Skeleton className="size-5" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
