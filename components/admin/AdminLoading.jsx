import ScreenSkeleton from '@/components/loading/ScreenSkeleton';

export default function AdminLoading({ label = 'workspace', screen = 'table' }) {
  return <ScreenSkeleton screen={screen} layout="portal" label={`Loading ${label}`} />;
}
