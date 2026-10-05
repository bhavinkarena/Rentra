import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SECTIONS,
  adminSectionForPath,
  adminTabMatches,
  permittedAdminSections,
  legacyApplicationHref,
  applicationQueueHref,
  applicationReturnHref,
  applicationDecisionHref,
} from '../lib/domain/admin-navigation.js';

test('every delivered destination and detail selects exactly one section and tab', () => {
  for (const section of ADMIN_SECTIONS) {
    for (const entry of section.tabs) {
      for (const path of entry.href === '/admin'
        ? [entry.href]
        : [entry.href, `${entry.href}/record`]) {
        assert.equal(adminSectionForPath(path)?.key, section.key);
        assert.equal(
          ADMIN_SECTIONS.flatMap((s) => s.tabs).filter((t) => adminTabMatches(path, t)).length,
          1,
        );
      }
    }
  }
  assert.equal(adminSectionForPath('/admin/finance/allocations/id')?.key, 'finance');
  assert.equal(adminSectionForPath('/admin/payments')?.key, 'settings');
  assert.equal(adminSectionForPath('/admin/finance/payments/id')?.key, 'finance');
  assert.equal(adminSectionForPath('/admin/clients-unrelated'), undefined);
});

test('restricted roles open their first permitted child and omit empty workspaces', () => {
  for (const [capability, key, href] of [
    ['admin.customers.read', 'people', '/admin/customers'],
    ['admin.records.read', 'bookings', '/admin/bookings'],
    ['admin.payments.read', 'finance', '/admin/finance/payments'],
    ['admin.reviews.read', 'reviews', '/admin/reviews'],
  ]) {
    const sections = permittedAdminSections([capability]);
    const operational = sections.filter((s) => !['dashboard', 'help'].includes(s.key));
    assert.equal(operational[0].key, key);
    assert.equal(operational[0].tabs[0].href, href);
    assert.ok(sections.every((s) => s.tabs.length));
    assert.ok(
      sections.flatMap((s) => s.tabs).every((t) => !t.capability || t.capability === capability),
    );
  }
  assert.deepEqual(
    permittedAdminSections().map((s) => s.key),
    ['dashboard', 'help'],
  );
  assert.equal(
    adminSectionForPath('/admin/applications/id', permittedAdminSections(['admin.customers.read'])),
    undefined,
  );
});

test('legacy root queue filters and feedback migrate together; dashboard queries stay home', () => {
  assert.equal(legacyApplicationHref({ period: 'month', environment: 'test' }), null);
  assert.equal(legacyApplicationHref(), null);
  const href = legacyApplicationHref({
    status: 'all',
    assignee: 'me',
    q: 'A & B',
    page: '2',
    decided: 'approved',
    extra: ['one', 'two'],
  });
  const url = new URL(href, 'https://fixture.invalid');
  assert.equal(url.pathname, '/admin/applications');
  assert.equal(url.searchParams.get('q'), 'A & B');
  assert.equal(url.searchParams.get('decided'), 'approved');
  assert.deepEqual(url.searchParams.getAll('extra'), ['one', 'two']);
});

test('queue filters reset page while preserving compatible search and extra parameters', () => {
  const href = applicationQueueHref(
    { status: 'approved', assignee: 'me', q: 'owner', page: 1 },
    { page: '8', decided: 'approved', context: ['a', 'b'] },
  );
  const url = new URL(href, 'https://fixture.invalid');
  assert.equal(url.pathname, '/admin/applications');
  assert.equal(url.searchParams.get('status'), 'approved');
  assert.equal(url.searchParams.get('q'), 'owner');
  assert.equal(url.searchParams.get('assignee'), 'me');
  assert.equal(url.searchParams.has('page'), false);
  assert.equal(url.searchParams.has('decided'), false);
  assert.deepEqual(url.searchParams.getAll('context'), ['a', 'b']);
  assert.equal(applicationQueueHref({}), '/admin/applications');
});

test('application breadcrumbs accept new and legacy queue context and reject other sections', () => {
  assert.equal(
    applicationReturnHref('/admin?status=all&assignee=me&page=2'),
    '/admin/applications?status=all&assignee=me&page=2',
  );
  assert.equal(
    applicationReturnHref('/admin/applications?q=owner&page=3'),
    '/admin/applications?q=owner&page=3',
  );
  for (const value of [
    undefined,
    '/admin',
    '/admin/customers',
    '//evil.test',
    'https://evil.test',
    '/admin/applications-other',
    '/admin/applications/../../login',
  ])
    assert.equal(applicationReturnHref(value), '/admin/applications');
});

test('decision feedback retains safe queue filters and the committed server outcome', () => {
  assert.equal(
    applicationDecisionHref(
      '/admin/applications?q=Asha&assignee=me&page=2',
      '/admin?decided=blocked',
    ),
    '/admin/applications?q=Asha&assignee=me&page=2&decided=blocked',
  );
  assert.equal(
    applicationDecisionHref('//evil.example', '/admin/applications?decided=approved'),
    '/admin/applications?decided=approved',
  );
  assert.equal(
    applicationDecisionHref('/admin/applications?decided=rejected', '/admin?decided=more_info'),
    '/admin/applications?decided=more_info',
  );
});
