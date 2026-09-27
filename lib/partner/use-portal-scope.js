'use client';
import { useEffect } from 'react';
import { useStore } from 'react-redux';

// The page's server guard can observe a new identity even while Next reuses
// the old shared layout. Never show that old layout's cache on the new page.
export function usePortalScope(scope) {
  const store = useStore();
  const matches = scope === store.portalLifecycle.portalScope && !store.portalLifecycle.disposed;
  useEffect(() => {
    if (!matches) window.dispatchEvent(new CustomEvent('rentra:identity', { detail: 'changed' }));
  }, [matches]);
  return matches;
}
