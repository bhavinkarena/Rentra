import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, resultMeta } from '../../lib/api/client.js';

test('redirect-only login responses retain navigation and revalidation metadata', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      success: true,
      data: null,
      redirect: '/login',
      revalidate: ['/account'],
    }),
  );
  const result = await apiFetch('/customer/auth/begin', { method: 'POST', anonymous: true });
  assert.deepEqual(resultMeta(result), { redirect: '/login', revalidate: ['/account'] });
  assert.deepEqual(result, {});
  assert.deepEqual(Reflect.ownKeys(result), []);
});

test('ordinary empty responses stay null and do not inherit another request metadata', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, data: null }));
  const result = await apiFetch('/empty', { method: 'POST', anonymous: true });
  assert.equal(result, null);
  assert.deepEqual(resultMeta(result), { redirect: null, revalidate: [] });
});

test('object payloads preserve their data while redirect metadata stays out of serialization', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      success: true,
      data: { ok: true },
      redirect: '/bookings',
    }),
  );
  const result = await apiFetch('/action', { method: 'POST', anonymous: true });
  assert.equal(JSON.stringify(result), '{"ok":true}');
  assert.equal(resultMeta(result).redirect, '/bookings');
});
