import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../api/config.js';

import { safePortalRedirect } from '../partner/cache.js';

const fetchQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/`,
  credentials: 'include',
  validateStatus: (response, body) =>
    response.status >= 200 && response.status < 300 && body?.success !== false,
});
const portalReads = new Set(['partner/listings', 'partner/listings/summary', 'partner/records']);
export async function rentraBaseQuery(args, api, options) {
  let request = typeof args === 'string' ? { url: args } : { ...args };
  if (!request.method || request.method === 'GET') request.timeout ??= 15000;
  const portal = api.extra?.portalScope;
  if (api.extra?.disposed) return { error: { status: 'CUSTOM_ERROR', error: 'Identity disposed' } };
  if (portal && portalReads.has(request.url) && (!request.method || request.method === 'GET')) {
    request = {
      ...request,
      url: `${window.location.origin}/api/partner-cache/${request.url}`,
      headers: { ...request.headers, 'X-Portal-Scope': portal },
    };
  }
  let result = await fetchQuery(request, api, options);
  // One retry for transient reads only. Writes are never automatically replayed.
  if (
    (!request.method || request.method === 'GET') &&
    !api.signal.aborted &&
    !api.extra?.disposed &&
    (result.error?.status === 'FETCH_ERROR' || Number(result.error?.status) >= 500)
  ) {
    result = await fetchQuery(request, api, options);
  }
  if (api.extra?.disposed) return { error: { status: 'CUSTOM_ERROR', error: 'Identity disposed' } };
  if (
    result.error?.status === 'PARSING_ERROR' &&
    [401, 403].includes(result.error.originalStatus)
  ) {
    result = { ...result, error: { ...result.error, status: result.error.originalStatus } };
  }
  if (result.data?.redirect && result.data.data == null) {
    result = { error: { status: 'PORTAL_REDIRECT', data: result.data }, meta: result.meta };
  }
  if (
    portal &&
    typeof window !== 'undefined' &&
    [401, 403, 'PORTAL_REDIRECT'].includes(result.error?.status)
  ) {
    window.dispatchEvent(
      new CustomEvent('rentra:access', {
        detail: {
          status: result.error.status,
          redirect: safePortalRedirect(result.error.data?.redirect),
        },
      }),
    );
  }
  return result;
}
// Preserve the full response envelope and domain/validation error metadata.
export const baseApi = createApi({
  reducerPath: 'rentraApi',
  baseQuery: rentraBaseQuery,
  tagTypes: [
    'CustomerAccount',
    'CustomerRecords',
    'CustomerSupport',
    'CustomerNotifications',
    'PartnerListings',
    'PartnerSummary',
    'PartnerUpdates',
    'PartnerRecords',
    'PartnerCalendar',
    'PartnerReviews',
    'AdminApplications',
    'AdminRecords',
    'AdminSupport',
    'AdminOperations',
  ],
  endpoints: () => ({}),
});
