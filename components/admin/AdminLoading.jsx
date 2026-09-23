import RentraLoader from '@/components/ui/rentra-loader';

export default function AdminLoading({ label = 'workspace' }) {
  return <RentraLoader variant="page" label={`Loading ${label}`} />;
}
