import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoveryApi, authApi } from '../../lib/api/endpoints.js';

test('only public display taxonomy opts into persistent caching', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return Response.json({ success: true, data: {} });
  });
  await discoveryApi.registry();
  await discoveryApi.search({ q: 'farmhouse' });
  await discoveryApi.availability('code', {});
  assert.equal(requests[0].options.credentials, 'omit');
  assert.deepEqual(requests[0].options.next, { revalidate: 300, tags: ['discovery-registry'] });
  assert.equal(requests[1].options.next, undefined);
  assert.equal(requests[2].options.cache, 'no-store');
});

test('identity read uses the lightweight endpoint without caching', async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  });
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, options };
    return Response.json({ success: true, data: { user: null } });
  });
  await authApi.identity();
  assert.ok(request.url.endsWith('/auth/identity'));
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.credentials, 'include');
});
