import { STATUS_TONES, propertyStatus, statusMeta } from '@/lib/domain/status';
import { StatusBadge } from '@/components/ui/status-badge';

/** Property status for every owner surface (PROP-01); the map lives in lib/domain/status. */
export function listingStatusMeta(status, reviewOutcome = null) {
  const meta = statusMeta('property', propertyStatus(status, reviewOutcome));
  const tone = STATUS_TONES[meta.tone];
  return { ...meta, hint: meta.hint ?? 'Status unavailable', className: tone.badge, dot: tone.dot };
}

export default function ListingStatusBadge({ status, reviewOutcome = null, showHint = false }) {
  if (showHint) {
    const meta = listingStatusMeta(status, reviewOutcome);
    return (
      <span className="inline-flex items-center gap-2">
        <span className={`size-2 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span>
          <span className="block text-tiny font-semibold text-ink-800">{meta.label}</span>
          <span className="block text-tiny text-ink-500">{meta.hint}</span>
        </span>
      </span>
    );
  }
  return <StatusBadge domain="property" state={propertyStatus(status, reviewOutcome)} />;
}
