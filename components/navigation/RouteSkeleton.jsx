import ScreenSkeleton from '@/components/loading/ScreenSkeleton';

export default function RouteSkeleton({ kind = 'table', label = 'Loading your page…' }) {
  return <ScreenSkeleton screen={kind === 'cards' ? 'search' : kind} label={label} />;
}
