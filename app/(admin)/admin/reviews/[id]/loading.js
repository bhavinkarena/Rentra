import ScreenSkeleton from '@/components/loading/ScreenSkeleton';

export default function Loading() {
  return (
    <ScreenSkeleton layout="portal" screen="review-detail" label="Loading admin reviews details" />
  );
}
