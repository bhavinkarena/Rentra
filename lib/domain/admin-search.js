import { safeReturnPath } from './portal-state.js';

export const ADMIN_SEARCH_TYPES = [
  {
    key: 'clients',
    label: 'Owners',
    capability: 'clients',
    method: 'clients',
    path: '/admin/clients',
    filters: { status: 'all' },
    hint: 'Name, email or phone',
  },
  {
    key: 'customers',
    label: 'Customers',
    capability: 'customers',
    method: 'customers',
    path: '/admin/customers',
    filters: { status: 'all' },
    hint: 'Name, email or phone',
  },
  {
    key: 'applications',
    label: 'Applications',
    capability: 'applications',
    method: 'applications',
    path: '/admin/applications',
    filters: { status: 'all' },
    hint: 'Owner or legal name, email',
  },
  {
    key: 'properties',
    label: 'Properties',
    capability: 'properties',
    method: 'properties',
    path: '/admin/properties',
    filters: { status: 'all' },
    hint: 'Title, owner email or exact property code',
  },
  {
    key: 'bookings',
    label: 'Bookings',
    capability: 'records',
    method: 'records',
    path: '/admin/bookings',
    filters: { tab: 'all' },
    hint: 'Booking or visit reference, property title, guest name or phone',
  },
  {
    key: 'cases',
    label: 'Booking cases',
    capability: 'records',
    method: 'cases',
    path: '/admin/booking-cases',
    filters: { state: 'all' },
    hint: 'Case or booking reference, property title',
  },
];

export function permittedSearchTypes(capabilities = []) {
  return ADMIN_SEARCH_TYPES.filter((type) =>
    capabilities.includes(`admin.${type.capability}.read`),
  );
}

export function adminSearchQuery(input = {}) {
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 100) : '';
  const type = ADMIN_SEARCH_TYPES.some((t) => t.key === input.type) ? input.type : 'all';
  const pages = Object.fromEntries(
    ADMIN_SEARCH_TYPES.map(({ key }) => {
      const value = input[`${key}Page`];
      return [
        key,
        typeof value === 'string' && /^\d{1,6}$/.test(value)
          ? Math.min(100000, Math.max(1, Number(value)))
          : 1,
      ];
    }),
  );
  return { q, type, pages };
}

export function adminSearchHref(input = {}) {
  const { q, type, pages } = adminSearchQuery(input);
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (type !== 'all') query.set('type', type);
  for (const [key, page] of Object.entries(pages))
    if (page > 1) query.set(`${key}Page`, String(page));
  return `/admin/search${query.size ? `?${query}` : ''}`;
}

/** Search returns carry only bounded, known fields; other lists retain their existing rules. */
export function adminRecordReturnHref(value, prefix) {
  const safe = safeReturnPath(value, '/admin/search', '');
  if (safe && safe.split(/[?#]/)[0] === '/admin/search') {
    return adminSearchHref(Object.fromEntries(new URL(safe, 'http://rentra.invalid').searchParams));
  }
  return safeReturnPath(value, prefix);
}

/** Check permission before requests. Each directory keeps its own result/failure. */
export async function loadAdminSearch(api, capabilities, input, settle) {
  const query = adminSearchQuery(input);
  const types = permittedSearchTypes(capabilities);
  const selected = types.filter((type) => query.type === 'all' || query.type === type.key);
  const results = query.q
    ? await Promise.all(
        selected.map(async (type) => ({
          ...type,
          result: await settle(
            api[type.method]({ ...type.filters, q: query.q, page: query.pages[type.key] }),
          ),
        })),
      )
    : [];
  return { ...query, types, results };
}
