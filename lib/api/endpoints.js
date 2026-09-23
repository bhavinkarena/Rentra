import { api, API_URL } from './client.js';

/**
 * The API surface, named.
 *
 * A typo in a path string is a 404 at runtime; a typo in a function name is
 * an error the moment the module loads. That is the whole reason this file
 * exists — it is not an abstraction layer, and it deliberately adds no
 * behaviour of its own.
 *
 * Grouped to match `rentra-backend/src/routes`. When a route moves, it moves
 * in both places, and `npm run routes` in the backend prints the truth.
 */

export const authApi = {
  me: () => api.get('/auth/me', { cache: 'no-store' }),
  requestOtp: (form) => api.post('/auth/otp/request', form),
  verifyOtp: (form) => api.post('/auth/otp/verify', form),
  requestPhoneOtp: (form) => api.post('/auth/phone/request', form),
  confirmPhoneOtp: (form) => api.post('/auth/phone/confirm', form),
  logout: () => api.post('/auth/logout'),
  /** Funnel counter for a locked call to action. Aggregate only. */
  recordLockedCta: (count = 1) => api.post('/auth/locked-cta', { count }),
};

export const customerAuthApi = {
  begin: (input) => api.post('/customer/auth/begin', input),
  requestOtp: (form) => api.post('/customer/auth/otp/request', form),
  verifyOtp: (form) => api.post('/customer/auth/otp/verify', form),
  switchToCustomer: () => api.post('/customer/auth/switch'),
  logout: () => api.post('/customer/auth/logout'),
  restoreSelection: (rentableId) => api.get(`/customer/auth/selection/${rentableId}`),
};

export const adminAuthApi = {
  me: () => api.get('/admin/auth/me', { cache: 'no-store' }),
  login: (form) => api.post('/admin/auth/login', form),
  logout: () => api.post('/admin/auth/logout'),
};

/**
 * Public discovery. No session is read on any of these, and that is
 * load-bearing rather than incidental: `anonymous` keeps the API client away
 * from the cookie jar, which is what lets the homepage, the city landing
 * pages and the listing page stay statically rendered and revalidate on a
 * timer instead of rendering per request.
 */
const PUBLIC = { anonymous: true };

export const discoveryApi = {
  listings: (query) => api.get(`/discovery/listings${qs(query)}`, PUBLIC),
  nearby: (query) => api.get(`/discovery/listings/nearby${qs(query)}`, PUBLIC),
  search: (query) => api.get(`/discovery/search${qs(query)}`, PUBLIC),
  registry: () => api.get('/discovery/registry', PUBLIC),
  routeCount: (path) => api.get(`/discovery/route-count${qs({ path })}`, PUBLIC),
  cities: () => api.get('/discovery/cities', PUBLIC),
  areas: (citySlug) => api.get(`/discovery/cities/${citySlug}/areas`, PUBLIC),
  areaCount: (citySlug, areaSlug) =>
    api.get(`/discovery/cities/${citySlug}/areas/${areaSlug}/count`, PUBLIC),
  sitemap: () => api.get('/discovery/sitemap', PUBLIC),
  listing: (code) => api.get(`/discovery/listings/${code}`, PUBLIC),
  nextDates: (code) => api.get(`/discovery/listings/${code}/next-dates`, PUBLIC),
  similar: (id, query) => api.get(`/discovery/listings/${id}/similar${qs(query)}`, PUBLIC),
  /**
   * Never cached, deliberately. The listing page is ISR-cached and a calendar
   * rendered from an hour-old page invites a guest to pick a Saturday that
   * sold twenty minutes ago.
   */
  availability: (code, query) =>
    api.get(`/discovery/listings/${code}/availability${qs(query)}`, {
      ...PUBLIC,
      cache: 'no-store',
    }),
};

export const bookingApi = {
  quote: (input) => api.post('/bookings/quote', input),
  hold: (input) => api.post('/bookings/checkout/hold', input),
  reviewQuote: (quoteId) => api.get(`/bookings/checkout/quote/${quoteId}`, { cache: 'no-store' }),
  reviewOrder: (orderId) => api.get(`/bookings/checkout/${orderId}`, { cache: 'no-store' }),
  recent: () => api.get('/bookings/checkout/recent', { cache: 'no-store' }),
  startPayment: (orderId) => api.post(`/bookings/checkout/${orderId}/start`),
  verifyPayment: (input) => api.post('/bookings/checkout/verify', input),
  status: (orderId) => api.get(`/bookings/checkout/${orderId}/status`, { cache: 'no-store' }),
  /** Reconcile with the gateway when the browser never came back from payment. */
  refresh: (orderId) => api.post(`/bookings/checkout/${orderId}/refresh`),
  release: (orderId) => api.post(`/bookings/checkout/${orderId}/release`),
};

export const partnerApi = {
  application: () => api.get('/partner/application', { cache: 'no-store' }),
  saveDetails: (form) => api.post('/partner/application/details', form),
  savePayout: (form) => api.post('/partner/application/payout', form),
  saveConsent: (form) => api.post('/partner/application/consent', form),
  submitApplication: () => api.post('/partner/application/submit'),
  withdrawApplication: () => api.post('/partner/application/withdraw'),

  documents: () => api.get('/partner/documents', { cache: 'no-store' }),
  uploadDocuments: (form) => api.post('/partner/documents', form),
  deleteDocument: (form) => api.del('/partner/documents', form),

  saveAccount: (form) => api.post('/partner/settings/account', form),
  savePayoutDestination: (form) => api.post('/partner/settings/payout', form),

  amenityCatalogue: () => api.get('/partner/catalogue/amenities'),
  categories: () => api.get('/partner/catalogue/categories'),
  places: () => api.get('/partner/catalogue/places'),

  summary: () => api.get('/partner/listings/summary', { cache: 'no-store' }),
  listings: (query) => api.get(`/partner/listings${qs(query)}`, { cache: 'no-store' }),
  listing: (id) => api.get(`/partner/listings/${id}`, { cache: 'no-store' }),
  createListing: (form) => api.post('/partner/listings', form),
  saveStep: (id, step, form) => api.post(`/partner/listings/${id}/${step}`, form),
  addPhotos: (id, form) => api.post(`/partner/listings/${id}/photos`, form),
  removePhoto: (id, form) => api.del(`/partner/listings/${id}/photos`, form),
  reorderPhotos: (id, form) => api.patch(`/partner/listings/${id}/photos/order`, form),
  uploadOwnershipDocument: (id, form) =>
    api.post(`/partner/listings/${id}/ownership-document`, form),
  submitListing: (id, form) => api.post(`/partner/listings/${id}/submit`, form),
  togglePause: (id, form) => api.post(`/partner/listings/${id}/pause`, form),

  calendar: (id) => api.get(`/partner/listings/${id}/calendar`, { cache: 'no-store' }),
  saveSchedule: (id, form) => api.post(`/partner/listings/${id}/calendar/schedule`, form),
  savePriceOverride: (id, form) =>
    api.post(`/partner/listings/${id}/calendar/price-override`, form),
  openDates: (id, form) => api.post(`/partner/listings/${id}/calendar/open-dates`, form),
  blockDates: (id, form) => api.post(`/partner/listings/${id}/calendar/block`, form),
  unblockDates: (id, form) => api.post(`/partner/listings/${id}/calendar/unblock`, form),

  records: (query) => api.get(`/partner/records${qs(query)}`, { cache: 'no-store' }),
  record: (id) => api.get(`/partner/records/${id}`, { cache: 'no-store' }),
  recordSummary: (id, calendar) =>
    api.get(`/partner/records/${id}/summary${qs({ calendar: calendar ? '1' : undefined })}`),
  recordVisit: (form) => api.post('/partner/records/visit', form),

  reviews: (query) => api.get(`/partner/reviews${qs(query)}`, { cache: 'no-store' }),
  replyToReview: (form) => api.post('/partner/reviews/reply', form),
  reportReview: (form) => api.post('/partner/reviews/report', form),
};

export const customerApi = {
  account: () => api.get('/customer/account', { cache: 'no-store' }),
  onboarding: () => api.get('/customer/account/onboarding', { cache: 'no-store' }),
  updateProfile: (form) => api.post('/customer/account/profile', form),
  requestPhoneChange: (form) => api.post('/customer/account/phone/request', form),
  confirmPhoneChange: (form) => api.post('/customer/account/phone/confirm', form),
  privacyRequest: (form) => api.post('/customer/account/privacy', form),

  records: (query) => api.get(`/customer/records${qs(query)}`, { cache: 'no-store' }),
  record: (id) => api.get(`/customer/records/${id}`, { cache: 'no-store' }),
  recordSummary: (id, calendar) =>
    api.get(`/customer/records/${id}/summary${qs({ calendar: calendar ? '1' : undefined })}`),
  rebook: (form) => api.post('/customer/records/rebook', form),
  /** Always previewed before it is executed — never cancelled in one call. */
  previewCancellation: (input) => api.post('/customer/records/cancellation/preview', input),
  cancel: (input) => api.post('/customer/records/cancellation', input),

  reviewForOrder: (orderId) => api.get(`/customer/reviews/order/${orderId}`, { cache: 'no-store' }),
  /** One published review, as the reporting form shows it back. */
  review: (reviewId) => api.get(`/customer/reviews/${reviewId}`, { cache: 'no-store' }),
  submitReview: (form) => api.post('/customer/reviews', form),
  reportReview: (form) => api.post('/customer/reviews/report', form),

  support: (query) => api.get(`/customer/support${qs(query)}`, { cache: 'no-store' }),
  supportThread: (id) => api.get(`/customer/support/${id}`, { cache: 'no-store' }),
  openSupport: (form) => api.post('/customer/support', form),
  replySupport: (id, form) => api.post(`/customer/support/${id}/reply`, form),

  notifications: () => api.get('/customer/notifications', { cache: 'no-store' }),
  markNotificationRead: (form) => api.post('/customer/notifications/read', form),
};

/** Works signed out too — the server decides guest versus account. */
export const savedApi = {
  mine: () => api.get('/saved', { cache: 'no-store' }),
  guest: (entries) => api.post('/saved/guest', { entries }),
  update: (scope, input) => api.post('/saved/update', { scope, input }),
  merge: (scope, input) => api.post('/saved/merge', { scope, input }),
};

export const adminApi = {
  applications: () => api.get('/admin/applications', { cache: 'no-store' }),
  applicationStats: () => api.get('/admin/applications/stats', { cache: 'no-store' }),
  recentDecisions: (limit) => api.get(`/admin/applications/decisions${qs({ limit })}`),
  application: (id) => api.get(`/admin/applications/${id}`, { cache: 'no-store' }),
  approve: (form) => api.post('/admin/applications/approve', form),
  requestMoreInfo: (form) => api.post('/admin/applications/more-info', form),
  reject: (form) => api.post('/admin/applications/reject', form),
  suspendClient: (form) => api.post('/admin/clients/suspend', form),

  userDocuments: (userId) => api.get(`/admin/users/${userId}/documents`, { cache: 'no-store' }),
  reviewDocument: (form) => api.post('/admin/documents/review', form),

  paymentConfiguration: () => api.get('/admin/payments/configuration', { cache: 'no-store' }),
  savePaymentConfiguration: (form) => api.post('/admin/payments/configuration', form),

  records: (query) => api.get(`/admin/records${qs(query)}`, { cache: 'no-store' }),
  record: (id) => api.get(`/admin/records/${id}`, { cache: 'no-store' }),
  recordVisit: (form) => api.post('/admin/records/visit', form),

  /** The reviewer's view of one KYC document. Returns bytes, not JSON. */
  documentFileUrl: (id) => `${API_URL}/admin/documents/${id}/file`,

  reviews: (query) => api.get(`/admin/reviews${qs(query)}`, { cache: 'no-store' }),
  moderateReview: (form) => api.post('/admin/reviews/moderate', form),
  resolveReviewReport: (form) => api.post('/admin/reviews/reports/resolve', form),

  support: (query) => api.get(`/admin/support${qs(query)}`, { cache: 'no-store' }),
  supportThread: (id) => api.get(`/admin/support/${id}`, { cache: 'no-store' }),
  replySupport: (id, form) => api.post(`/admin/support/${id}/reply`, form),

  notifications: (query) => api.get(`/admin/notifications${qs(query)}`, { cache: 'no-store' }),
  manageNotification: (form) => api.post('/admin/notifications/manage', form),

  privacyQueue: (query) => api.get(`/admin/privacy${qs(query)}`, { cache: 'no-store' }),
  startPrivacyReview: (form) => api.post('/admin/privacy/review', form),

  operations: () => api.get('/admin/operations', { cache: 'no-store' }),
};

/** Drops undefined and empty values so `?limit=&page=` never reaches the API. */
function qs(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}
