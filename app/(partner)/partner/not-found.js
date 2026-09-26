import PortalState from '@/components/portal/PortalState';

export default function PortalNotFound() {
  return <PortalState kind="not_found" backHref="/partner" backLabel="Go to owner overview" />;
}
