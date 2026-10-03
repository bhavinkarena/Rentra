import { test } from 'node:test';
import assert from 'node:assert/strict';
import { failureKind, safeReturnPath } from '../../lib/domain/portal-state.js';

test('only a definite missing record becomes not-found; outages never do', () => {
  assert.equal(failureKind({ status: 404 }), 'not_found');
  assert.equal(failureKind({ status: 422 }), 'not_found');
  assert.equal(failureKind({ status: 403 }), 'forbidden');
  for (const status of [0, 500, 502, 503, 409, undefined])
    assert.equal(failureKind({ status }), 'unavailable');
  assert.equal(failureKind(null), 'unavailable');
});

test('return paths stay inside the portal list they belong to', () => {
  const list = '/partner/listings';
  assert.equal(
    safeReturnPath('/partner/listings?q=farm&page=2', list),
    '/partner/listings?q=farm&page=2',
  );
  assert.equal(safeReturnPath('/partner/listings', list), '/partner/listings');
  for (const value of [
    undefined,
    '',
    'https://evil.test/partner/listings',
    '//evil.test/partner/listings',
    '/\\evil.test',
    '/partner/listingsX',
    '/admin/support',
    `/partner/listings?${'x'.repeat(600)}`,
  ])
    assert.equal(safeReturnPath(value, list), list);
});

test('a form failure without field errors still has a message to show', async () => {
  const { formError } = await import('../../lib/domain/portal-state.js');
  assert.equal(
    formError({ error: 'Rentra could not be reached.' }),
    'Rentra could not be reached.',
  );
  assert.equal(
    formError({ errors: { _: 'Upload is not configured.' } }),
    'Upload is not configured.',
  );
  // Field errors are shown beside their fields, not repeated as a banner.
  assert.equal(formError({ errors: { name: 'Required' }, error: 'Check the fields' }), null);
  assert.equal(formError({ ok: true }), null);
  assert.equal(formError({}), null);
});
