import 'server-only';

import { notFound } from 'next/navigation';
import { ApiError } from './client.js';
import { failureKind } from '@/lib/domain/portal-state';

/**
 * Load a page's primary record and classify failure instead of hiding it.
 *
 * Returns `{ data }` on success. A definite missing record calls `notFound()`;
 * a 403 or an outage returns `{ failure }` for `<PortalState>` to render with
 * a retry. Redirects and non-API errors propagate unchanged.
 */
export async function settle(request) {
  try {
    return { data: await request };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const failure = failureKind(error);
    if (failure === 'not_found') notFound();
    return { failure };
  }
}
