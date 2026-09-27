import ScreenSkeleton from '@/components/loading/ScreenSkeleton';

export default function Loading() {
  return <ScreenSkeleton screen="search" label="Loading [city] [category] [[...place]]" />;
}
