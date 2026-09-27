export const partnerTags = [
  'PartnerListings',
  'PartnerSummary',
  'PartnerRecords',
  'PartnerCalendar',
  'PartnerUpdates',
];
export function disposePortalStore(store) {
  store.portalLifecycle.disposed = true;
  for (const request of [
    ...store.dispatch(store.portalApi.util.getRunningQueriesThunk()),
    ...store.dispatch(store.portalApi.util.getRunningMutationsThunk()),
  ])
    request.abort();
  store.dispatch(store.portalApi.util.resetApiState());
}
export function safePortalRedirect(value) {
  return typeof value === 'string' &&
    /^\/partner(?:\/(?:login|onboarding))?(?:\?[^\\\r\n]*)?$/.test(value)
    ? value
    : null;
}

export function tagsForPartnerPaths(paths = []) {
  const tags = new Set();
  for (const path of paths) {
    if (path === '/' || path === '/partner') partnerTags.forEach((tag) => tags.add(tag));
    else if (/^\/partner\/listings(?:\/|$)/.test(path)) {
      ['PartnerListings', 'PartnerSummary', 'PartnerCalendar'].forEach((tag) => tags.add(tag));
    } else if (/^\/partner\/bookings(?:\/|$)/.test(path)) {
      ['PartnerRecords', 'PartnerSummary', 'PartnerCalendar'].forEach((tag) => tags.add(tag));
    } else if (/^\/partner\/calendar(?:\/|$)/.test(path)) {
      ['PartnerCalendar', 'PartnerListings', 'PartnerSummary'].forEach((tag) => tags.add(tag));
    } else if (/^\/partner\/updates(?:\/|$)/.test(path)) tags.add('PartnerUpdates');
  }
  return [...tags];
}
export function tagsForRevision(revision) {
  const tags = String(revision)
    .split(':')[1]
    ?.split(',')
    .filter((tag) => partnerTags.includes(tag));
  return tags?.length ? tags : partnerTags;
}
