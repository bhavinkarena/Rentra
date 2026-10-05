const BOOKING_FILTERS = [
  'tab',
  'q',
  'page',
  'property',
  'resource',
  'vertical',
  'from',
  'to',
  'event',
  'createdFrom',
  'createdTo',
  'environment',
  'rentOnly',
  'unit',
];

export function adminBookingHref(data = {}, changes = {}) {
  const params = new URLSearchParams();
  for (const key of BOOKING_FILTERS) {
    const value = changes[key] ?? data[key];
    if (value != null && value !== '') params.set(key, String(value));
  }
  if (changes.tab && changes.tab !== 'today') params.delete('unit');
  for (const key of ['booking', 'recordTab']) {
    if (changes[key]) params.set(key, changes[key]);
  }
  return `/admin/bookings${params.size ? `?${params}` : ''}`;
}

export function bookingSheetContext(query, id) {
  const closeHref = adminBookingHref(query);
  const params = new URLSearchParams({ from: closeHref });
  if (typeof query.recordTab === 'string') params.set('tab', query.recordTab);
  return { closeHref, fullHref: `/admin/bookings/${id}?${params}` };
}

export function adminCaseHref(data = {}, changes = {}) {
  const params = new URLSearchParams();
  for (const key of ['state', 'type', 'assigned', 'q', 'page']) {
    const value = changes[key] ?? data[key];
    if (
      !value ||
      (['type', 'assigned'].includes(key) && value === 'all') ||
      (key === 'page' && String(value) === '1')
    )
      continue;
    params.set(key, String(value));
  }
  if (changes.case) params.set('case', changes.case);
  return `/admin/booking-cases${params.size ? `?${params}` : ''}`;
}
