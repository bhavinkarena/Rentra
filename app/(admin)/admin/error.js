'use client';

import PortalState from '@/components/portal/PortalState';

/** An unexpected failure below the shell is an outage, never an empty page or a 404. */
export default function PortalError({ reset }) {
  return (
    <PortalState
      kind="unavailable"
      onRetry={reset}
      backHref="/admin"
      backLabel="Go to applications queue"
    />
  );
}
