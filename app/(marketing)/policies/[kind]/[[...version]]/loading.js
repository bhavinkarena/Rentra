import ScreenSkeleton from '@/components/loading/ScreenSkeleton';

export default function Loading() {
  return <ScreenSkeleton screen="document" label="Loading policies [kind] [[...version]]" />;
}
