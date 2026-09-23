import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../../lib/services/baseApi.service.js';
import { customerService } from '../../lib/services/customer.service.js';
import { partnerService } from '../../lib/services/partner.service.js';
import { adminService } from '../../lib/services/admin.service.js';

function store() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (defaults) => defaults().concat(baseApi.middleware),
  });
}

test('services share a cache, use real routes and preserve envelopes and cookies', async (t) => {
  assert.equal(customerService, baseApi);
  assert.equal(partnerService, baseApi);
  assert.equal(adminService, baseApi);
  const requests = [];
  const envelope = {
    statusCode: 200,
    success: true,
    data: { id: 'record' },
    redirect: '/account',
    revalidate: ['/account'],
  };
  t.mock.method(globalThis, 'fetch', async (request) => {
    requests.push(request);
    return Response.json(envelope);
  });
  const first = store();
  const second = store();
  try {
    const result = await first.dispatch(
      partnerService.endpoints.getOwnerBookings.initiate({ page: 2 }),
    );
    assert.deepEqual(result.data, envelope);
    assert.equal(new URL(requests[0].url).pathname, '/api/v1/partner/records');
    assert.equal(new URL(requests[0].url).search, '?page=2');
    assert.equal(requests[0].credentials, 'include');
    assert.deepEqual(second.getState().rentraApi.queries, {});
    await first.dispatch(
      customerService.endpoints.updateCustomerProfile.initiate({ name: 'Test' }),
    );
    assert.equal(requests[1].method, 'POST');
    assert.deepEqual(await requests[1].json(), { name: 'Test' });
  } finally {
    first.dispatch(baseApi.util.resetApiState());
    second.dispatch(baseApi.util.resetApiState());
  }
});

test('HTTP and application errors retain validation fields for forms', async (t) => {
  const state = store();
  const payload = {
    statusCode: 422,
    success: false,
    code: 'INVALID_INPUT',
    errors: { name: 'Required' },
    data: null,
  };
  let status = 422;
  t.mock.method(globalThis, 'fetch', async () => Response.json(payload, { status }));
  try {
    const result = await state.dispatch(
      customerService.endpoints.updateCustomerProfile.initiate({}),
    );
    assert.equal(result.error.status, 422);
    assert.deepEqual(result.error.data.errors, { name: 'Required' });
    status = 200;
    const failure = await state.dispatch(
      customerService.endpoints.updateCustomerProfile.initiate({}),
    );
    assert.equal(failure.error.data.success, false);
  } finally {
    state.dispatch(baseApi.util.resetApiState());
  }
});
