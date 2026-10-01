import { Suspense } from 'react';
import SiteChrome from '@/components/rentra/SiteChrome';
import ScreenSkeleton from '@/components/loading/ScreenSkeleton';

export default function MarketingLayout({ children }) {
  return (
    <SiteChrome>
      {/* This boundary persists between the two homes. React keeps the current
          page visible during navigation and uses the skeleton for the first visit. */}
      <Suspense fallback={<ScreenSkeleton screen="home" label="Loading home" />}>
        {children}
      </Suspense>
    </SiteChrome>
  );
}
