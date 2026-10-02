const text = (value) => (typeof value === 'string' ? value.trim().slice(0, 100) : '');
const page = (value) =>
  typeof value === 'string' && /^\d{1,6}$/.test(value) ? Math.max(1, Number(value)) : 1;
export function normalizeListings(input = {}) {
  return {
    query: text(input.q),
    status: [
      'all',
      'live',
      'review',
      'needs_you',
      'drafts',
      'attention',
      'resubmit',
      'unbookable',
      'paused',
      'hidden',
    ].includes(input.status)
      ? input.status
      : 'all',
    vertical: ['farmhouse', 'entertainment'].includes(input.vertical) ? input.vertical : '',
    page: page(input.page),
    pageSize: 10,
  };
}
export function normalizeBookings(input = {}) {
  return {
    q: text(input.q),
    page: page(input.page),
    tab: ['all', 'upcoming', 'past', 'cancelled', 'today', 'action_needed'].includes(input.tab)
      ? input.tab
      : 'all',
    property:
      typeof input.property === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.property)
        ? input.property
        : '',
    resource:
      typeof input.resource === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.resource)
        ? input.resource
        : '',
    vertical: ['farmhouse', 'entertainment'].includes(input.vertical) ? input.vertical : '',
  };
}
