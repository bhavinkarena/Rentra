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

/** One search hit as title, secondary line, copyable reference and state. */
export function adminSearchRecord(type, item) {
  if (type === 'clients' || type === 'customers')
    return {
      title: item.name || item.email || 'Name not set',
      description: [item.email, item.phone && `+91 ${item.phone}`].filter(Boolean).join(' \u00b7 '),
      reference: item.id,
      state: item.accountStatus,
    };
  if (type === 'applications')
    return {
      title: item.legalName || item.email,
      description: item.email,
      reference: item.id,
      state: item.status,
    };
  if (type === 'properties')
    return {
      title: item.title,
      description: item.publicCode,
      reference: item.publicCode || item.id,
      state: item.status,
    };
  return {
    title: item.title || 'Booked property',
    description:
      type === 'cases' ? `Booking ${item.orderReference}` : `${item.visitCount ?? 0} visits`,
    reference: item.reference,
    state: item.state,
  };
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
