const STATUS_META = {
  live: {
    label: 'Live',
    hint: 'Visible to guests',
    className: 'bg-success-bg text-success ring-success/15',
    dot: 'bg-success',
  },
  pending_review: {
    label: 'In review',
    hint: 'With the Rentra team',
    className: 'bg-warning-bg text-warning ring-warning/15',
    dot: 'bg-warning',
  },
  pending_verification: {
    label: 'Verification',
    hint: 'Visit is being arranged',
    className: 'bg-warning-bg text-warning ring-warning/15',
    dot: 'bg-warning',
  },
  rejected: {
    label: 'Needs changes',
    hint: 'Update and resubmit',
    className: 'bg-danger-bg text-danger ring-danger/15',
    dot: 'bg-danger',
  },
  paused: {
    label: 'Paused',
    hint: 'Not taking new bookings',
    className: 'bg-info-bg text-info ring-info/15',
    dot: 'bg-info',
  },
  hidden: {
    label: 'Hidden',
    hint: 'Not visible to guests',
    className: 'bg-ink-100 text-ink-700 ring-ink-700/10',
    dot: 'bg-ink-500',
  },
  draft: {
    label: 'Draft',
    hint: 'Not submitted yet',
    className: 'bg-ink-100 text-ink-700 ring-ink-700/10',
    dot: 'bg-ink-500',
  },
};

export function listingStatusMeta(status) {
  return STATUS_META[status] ?? {
    label: status?.replace(/_/g, ' ') || 'Unknown',
    hint: 'Status unavailable',
    className: 'bg-ink-100 text-ink-700 ring-ink-700/10',
    dot: 'bg-ink-500',
  };
}

export default function ListingStatusBadge({ status, showHint = false }) {
  const meta = listingStatusMeta(status);

  if (showHint) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={`size-2 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span>
          <span className="block text-tiny font-semibold text-ink-800">{meta.label}</span>
          <span className="block text-[0.68rem] text-ink-500">{meta.hint}</span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold capitalize ring-1 ring-inset ${meta.className}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
