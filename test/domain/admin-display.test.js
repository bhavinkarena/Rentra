import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminDateTime } from '../../lib/domain/admin-display.js';
import {
  ADMIN_STATUS,
  STATUS_TONES,
  adminStatusMeta,
  statusMeta,
} from '../../lib/domain/status.js';
import { detailTabHref, pickDetailTab } from '../../lib/domain/detail-navigation.js';

test('admin timestamps cross UTC/IST date boundaries with deterministic labels', () => {
  assert.equal(adminDateTime('2026-10-04T18:29:00Z'), '04 Oct 2026, 23:59 IST');
  assert.equal(adminDateTime('2026-10-04T18:30:00Z'), '05 Oct 2026, 00:00 IST');
  assert.equal(adminDateTime('2026-10-05T05:15:00+05:30'), '05 Oct 2026, 05:15 IST');
  assert.equal(adminDateTime(null), 'Not recorded');
  assert.equal(adminDateTime('invalid'), 'Date unavailable');
});

test('admin statuses remain domain-specific and never assert captured cash from success alone', () => {
  assert.equal(adminStatusMeta('application', 'submitted').label, 'Waiting for review');
  assert.equal(adminStatusMeta('account', 'blocked').tone, 'danger');
  assert.equal(adminStatusMeta('payment', 'succeeded').label, 'Succeeded');
  assert.equal(adminStatusMeta('export', 'completed').label, 'Ready');
  assert.equal(adminStatusMeta('visit', 'completed').label, 'Completed');
  assert.equal(adminStatusMeta('export', 'blocked').tone, 'neutral');
  assert.equal(
    adminStatusMeta('application', 'awaiting_owner_details').label,
    'Awaiting owner details',
  );
  assert.equal(statusMeta('booking', 'waiting_customer').label, 'Waiting for you');
  for (const states of Object.values(ADMIN_STATUS))
    for (const meta of Object.values(states)) assert.ok(STATUS_TONES[meta.tone]);
});

test('record-section links preserve encoded return context and repeated filters', () => {
  const tabs = [{ key: 'overview' }, { key: 'history' }];
  const params = {
    tab: 'unknown',
    from: '/admin/applications?q=A & B&page=3',
    scope: ['one', 'two'],
    page: undefined,
  };
  const href = detailTabHref('/admin/applications/id', 'history', tabs, params);
  const url = new URL(href, 'https://fixture.invalid');
  assert.equal(url.searchParams.get('tab'), 'history');
  assert.equal(url.searchParams.get('from'), params.from);
  assert.deepEqual(url.searchParams.getAll('scope'), ['one', 'two']);
  assert.equal(url.searchParams.has('page'), false);
  assert.equal(pickDetailTab('unknown', tabs), 'overview');
  assert.equal(
    new URL(detailTabHref('/admin/applications/id', 'unknown', tabs, params), url).searchParams.has(
      'tab',
    ),
    false,
  );
  assert.equal(detailTabHref('/admin/applications/id', 'overview', tabs), '/admin/applications/id');
  assert.equal(pickDetailTab('missing', []), undefined);
});
