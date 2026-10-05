import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SEARCH_TYPES,
  adminSearchQuery,
  adminSearchHref,
  adminRecordReturnHref,
  loadAdminSearch,
  permittedSearchTypes,
} from '../lib/domain/admin-search.js';
import { applicationReturnHref, applicationDecisionHref } from '../lib/domain/admin-navigation.js';

test('search only calls permitted selected directories and does nothing for empty or forbidden scope', async () => {
  const calls = [];
  const api = Object.fromEntries(
    ADMIN_SEARCH_TYPES.map((t) => [
      t.method,
      async (input) => {
        calls.push([t.key, input]);
        return { items: [], total: 0 };
      },
    ]),
  );
  const settle = async (request) => ({ data: await request });
  const caps = ['admin.records.read'];
  const search = await loadAdminSearch(
    api,
    caps,
    { q: '  V-%_  ', bookingsPage: '2', casesPage: '3' },
    settle,
  );
  assert.deepEqual(calls, [
    ['bookings', { tab: 'all', q: 'V-%_', page: 2 }],
    ['cases', { state: 'all', q: 'V-%_', page: 3 }],
  ]);
  assert.deepEqual(
    search.types.map((t) => t.key),
    ['bookings', 'cases'],
  );
  calls.length = 0;
  await loadAdminSearch(api, caps, { q: 'reference', type: 'cases' }, settle);
  assert.deepEqual(
    calls.map(([key]) => key),
    ['cases'],
  );
  calls.length = 0;
  for (const input of [{ q: '  ' }, { q: 'reference', type: 'clients' }])
    await loadAdminSearch(api, caps, input, settle);
  assert.equal(calls.length, 0);
  assert.deepEqual(permittedSearchTypes(['admin.support.read']), []);
  assert.deepEqual(
    permittedSearchTypes(['admin.applications.read']).map((t) => t.key),
    ['applications'],
  );
});

test('a permitted directory failure preserves other results and independent page numbers', async () => {
  const caps = ['admin.clients.read', 'admin.properties.read'];
  const result = await loadAdminSearch(
    {
      clients: async () => {
        throw new Error('unavailable');
      },
      properties: async (input) => ({ ...input, items: [{ id: 'visible' }], total: 24 }),
    },
    caps,
    { q: 'farm', propertiesPage: '2' },
    async (request) => {
      try {
        return { data: await request };
      } catch {
        return { failure: 'unavailable' };
      }
    },
  );
  assert.equal(result.results[0].result.failure, 'unavailable');
  assert.equal(result.results[1].result.data.page, 2);
  assert.equal(result.results[1].result.data.items[0].id, 'visible');
});

test('search bounds strings/pages, rejects repeated inputs, and canonicalizes safe detail returns', () => {
  assert.equal(adminSearchQuery({ q: 'x'.repeat(200), clientsPage: '999999' }).q.length, 100);
  assert.equal(adminSearchQuery({ clientsPage: '999999' }).pages.clients, 100000);
  for (const value of ['-2', '1.5', '1e4', '1000000', ['2']])
    assert.equal(adminSearchQuery({ clientsPage: value }).pages.clients, 1);
  assert.equal(adminSearchQuery({ q: ['first', 'second'], type: ['clients'] }).q, '');
  assert.equal(adminSearchQuery({ type: 'unsupported' }).type, 'all');
  const href = adminSearchHref({
    q: ' A & %_ ',
    type: 'properties',
    clientsPage: '2',
    propertiesPage: '3',
    extra: 'private',
  });
  assert.equal(new URL(href, 'http://fixture').searchParams.get('q'), 'A & %_');
  assert.ok(!href.includes('extra'));
  assert.equal(adminRecordReturnHref(href + '&extra=private', '/admin/properties'), href);
  assert.equal(
    adminRecordReturnHref('/admin/properties?q=river&page=3', '/admin/properties'),
    '/admin/properties?q=river&page=3',
  );
  for (const value of [
    '//evil.test',
    'https://evil.test',
    '/admin/search/../../login',
    '/admin/search-other?q=foo',
    '/admin/search\\evil',
  ])
    assert.equal(adminRecordReturnHref(value, '/admin/properties'), '/admin/properties');
});

test('application decisions from search keep matching queue context and committed feedback', () => {
  const search = '/admin/search?q=Owner&applicationsPage=2&propertiesPage=3';
  assert.equal(applicationReturnHref(search), '/admin/applications?status=all&q=Owner&page=2');
  assert.equal(
    applicationDecisionHref(search, '/admin?decided=approved'),
    '/admin/applications?status=all&q=Owner&page=2&decided=approved',
  );
});
