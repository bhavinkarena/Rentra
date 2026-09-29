import ScreenSkeleton from '@/components/loading/ScreenSkeleton';

export default function Loading() {
  return (
    <ScreenSkeleton
      layout="portal"
      screen="case-detail"
      label="Loading admin booking-cases details"
    />
  );
}
