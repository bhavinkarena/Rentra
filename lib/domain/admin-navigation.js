import { safeReturnPath } from './portal-state.js';
import { adminSearchQuery } from './admin-search.js';

const tab = (href, label, scope, writeScope = scope) => ({
  href,
  label,
  capability: scope ? `admin.${scope}.read` : null,
  writeCapability: writeScope ? `admin.${writeScope}.write` : null,
});

export const ADMIN_SECTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    tabs: [
      tab('/admin', 'Overview'),
      tab('/admin/analytics', 'Analytics'),
      tab('/admin/activity', 'Activity'),
    ],
  },
  {
    key: 'reviews',
    label: 'Reviews & approvals',
    tabs: [
      tab('/admin/applications', 'Owner applications', 'applications'),
      tab('/admin/properties', 'Property review', 'properties'),
      tab('/admin/reviews', 'Guest reviews', 'reviews'),
    ],
  },
  {
    key: 'bookings',
    label: 'Bookings',
    tabs: [
      tab('/admin/bookings', 'Booking records', 'records'),
      tab('/admin/booking-cases', 'Booking cases', 'records'),
    ],
  },
  {
    key: 'people',
    label: 'People',
    tabs: [
      tab('/admin/clients', 'Owners', 'clients'),
      tab('/admin/customers', 'Customers', 'customers'),
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    tabs: [
      tab('/admin/finance', 'Overview', 'payments'),
      tab('/admin/finance/payments', 'Payments', 'payments'),
      tab('/admin/finance/refunds', 'Refunds', 'payments'),
      tab('/admin/finance/statements', 'Statements', 'payments'),
      tab('/admin/finance/payouts', 'Payouts', 'payments'),
      tab('/admin/disputes', 'Disputes', 'payments'),
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    tabs: [
      tab('/admin/operations', 'Service health', 'operations'),
      tab('/admin/notifications', 'Message delivery', 'notifications'),
      tab('/admin/privacy', 'Privacy requests', 'privacy'),
      tab('/admin/audit', 'Audit & exports', 'audit'),
    ],
  },
  {
    key: 'settings',
    label: 'Settings & content',
    tabs: [
      tab('/admin/content', 'Public content', 'content'),
      tab('/admin/catalogues', 'Catalogues', 'catalogues'),
      tab('/admin/payments', 'Gateway settings', 'payments'),
      tab('/admin/security', 'Operators & security', 'security'),
    ],
  },
  {
    key: 'help',
    label: 'Help & guide',
    footer: true,
    tabs: [tab('/admin/help', 'Guide'), tab('/admin/support', 'Support inbox', 'support')],
  },
];

export function adminTabMatches(pathname, entry) {
  if (entry.href === '/admin' || entry.href === '/admin/finance') return pathname === entry.href;
  // Allocation evidence belongs to the statement workspace.
  if (
    entry.href === '/admin/finance/statements' &&
    pathname.startsWith('/admin/finance/allocations/')
  )
    return true;
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}

export function permittedAdminSections(capabilities = []) {
  return ADMIN_SECTIONS.map((section) => ({
    ...section,
    tabs: section.tabs.filter(
      (entry) => !entry.capability || capabilities.includes(entry.capability),
    ),
  })).filter((section) => section.tabs.length);
}

export function adminSectionForPath(pathname, sections = ADMIN_SECTIONS) {
  return sections.find((section) => section.tabs.some((entry) => adminTabMatches(pathname, entry)));
}

export function adminRouteLabel(pathname) {
  if (pathname === '/admin/search') return 'Search';
  const section = adminSectionForPath(pathname);
  return (
    section?.tabs.find((entry) => adminTabMatches(pathname, entry))?.label || 'Admin workspace'
  );
}

const APPLICATION_KEYS = ['status', 'assignee', 'q', 'page', 'decided'];

export function legacyApplicationHref(params = {}) {
  if (!APPLICATION_KEYS.some((key) => Object.hasOwn(params, key))) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item != null) query.append(key, String(item));
    }
  }
  return `/admin/applications?${query}`;
}

export function applicationReturnHref(value) {
  const safe = safeReturnPath(value, '/admin', '/admin/applications');
  const [path, query = ''] = safe.split('?');
  if (path === '/admin/search') {
    const search = adminSearchQuery(Object.fromEntries(new URLSearchParams(query)));
    return applicationQueueHref({ status: 'all', q: search.q, page: search.pages.applications });
  }
  if (path === '/admin') {
    return (
      legacyApplicationHref(Object.fromEntries(new URLSearchParams(query))) || '/admin/applications'
    );
  }
  return path.split('#')[0] === '/admin/applications' ? safe : '/admin/applications';
}

/** Preserve the validated queue and use the server's committed decision feedback. */
export function applicationDecisionHref(from, location) {
  const queue = new URL(applicationReturnHref(from), 'http://rentra.invalid');
  const outcome = new URL(location, 'http://rentra.invalid').searchParams.get('decided');
  if (['approved', 'more_info', 'rejected', 'blocked'].includes(outcome))
    queue.searchParams.set('decided', outcome);
  return queue.pathname + queue.search;
}

export function applicationQueueHref(
  { status = 'submitted', assignee = 'any', q = '', page = 1 },
  query = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (!APPLICATION_KEYS.includes(key)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item != null) params.append(key, String(item));
      }
    }
  }
  if (status !== 'submitted') params.set('status', status);
  if (assignee !== 'any') params.set('assignee', assignee);
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  return `/admin/applications${params.size ? `?${params}` : ''}`;
}
