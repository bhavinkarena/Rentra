'use client';

import SavedPlacesProvider from '@/components/customer/SavedPlacesProvider';

/**
 * Client boundary for customer-facing routes only.
 *
 * `children` still renders as Server Components — passing them through a
 * Client Component does not convert them. Provider dependencies still ship
 * to the browser, so keep admin/partner/staff routes outside this boundary.
 */
export default function Providers({ children }) {
  return <SavedPlacesProvider>{children}</SavedPlacesProvider>;
}
