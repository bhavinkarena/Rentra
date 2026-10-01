'use client';

import dynamic from 'next/dynamic';
import Skeleton from '@/components/ui/skeleton';

function PickerSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading available times">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default dynamic(() => import('./TimeSlotPicker'), {
  ssr: false,
  loading: PickerSkeleton,
});
