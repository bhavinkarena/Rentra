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

test('retained identical arguments reuse data; different arguments have isolated entries', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ success: true, data: { items: [], total: 0 } });
  });
  const state = store();
  const first = state.dispatch(
    partnerService.endpoints.getPartnerListings.initiate({ query: 'one', page: 1 }),
  );
  try {
    await first;
    first.unsubscribe();
    const second = state.dispatch(
      partnerService.endpoints.getPartnerListings.initiate({ page: 1, query: 'one' }),
    );
    await second;
    assert.equal(calls, 1);
    const third = state.dispatch(
      partnerService.endpoints.getPartnerListings.initiate({ query: 'two', page: 1 }),
    );
    await third;
    assert.equal(calls, 2);
    second.unsubscribe();
    third.unsubscribe();
  } finally {
    state.dispatch(baseApi.util.resetApiState());
  }
});

test('read redirects are errors, transient reads retry once, mutations never retry', async (t) => {
  let calls = 0;
  let response = () =>
    Response.json({ success: true, data: null, redirect: 'https://untrusted.example' });
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return response();
  });
  const state = store();
  try {
    const redirect = await state.dispatch(partnerService.endpoints.getPartnerSummary.initiate());
    assert.equal(redirect.error.status, 'PORTAL_REDIRECT');
    response = () => Response.json({ success: false }, { status: 503 });
    calls = 0;
    const read = await state.dispatch(partnerService.endpoints.getPartnerListings.initiate({}));
    assert.equal(read.error.status, 503);
    assert.equal(calls, 2);
    calls = 0;
    await state.dispatch(partnerService.endpoints.recordPartnerVisit.initiate({}));
    assert.equal(calls, 1);
  } finally {
    state.dispatch(baseApi.util.resetApiState());
  }
});

test('401 and resource 403 retain status and cannot be mistaken for successful empty lists', async (t) => {
  let status = 401;
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ success: false, code: 'ACCESS', errors: { property: 'Denied' } }, { status }),
  );
  const state = store();
  try {
    for (status of [401, 403]) {
      const result = await state.dispatch(
        partnerService.endpoints.getOwnerBookings.initiate({ page: status }),
      );
      assert.equal(result.error.status, status);
      assert.equal(result.data, undefined);
      assert.equal(result.error.data.code, 'ACCESS');
    }
  } finally {
    state.dispatch(baseApi.util.resetApiState());
  }
});

test('only successful calendar writes invalidate calendars and dependent listing counts', async (t) => {
  const reads = [];
  let denied = true;
  t.mock.method(globalThis, 'fetch', async (request) => {
    if (request.method === 'POST')
      return Response.json({ success: !denied, data: {} }, { status: denied ? 422 : 200 });
    reads.push(new URL(request.url).pathname);
    return Response.json({ success: true, data: { items: [] } });
  });
  const state = store();
  const subscriptions = [
    state.dispatch(partnerService.endpoints.getPartnerCalendar.initiate('property')),
    state.dispatch(partnerService.endpoints.getPartnerListings.initiate({})),
    state.dispatch(partnerService.endpoints.getPartnerSummary.initiate()),
  ];
  try {
    await Promise.all(subscriptions);
    reads.length = 0;
    await state.dispatch(
      partnerService.endpoints.blockSlots.initiate({ id: 'property', body: {} }),
    );
    assert.deepEqual(reads, []);
    denied = false;
    await state.dispatch(
      partnerService.endpoints.blockSlots.initiate({ id: 'property', body: {} }),
    );
    await Promise.all(state.dispatch(baseApi.util.getRunningQueriesThunk()));
    assert.deepEqual(
      reads.sort(),
      [
        '/api/v1/partner/listings',
        '/api/v1/partner/listings/property/calendar',
        '/api/v1/partner/listings/summary',
      ].sort(),
    );
  } finally {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    state.dispatch(baseApi.util.resetApiState());
  }
});

test('non-JSON authorization failures cannot leave stale private data visible', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Access denied', { status: 403 }));
  const state = store();
  try {
    const result = await state.dispatch(partnerService.endpoints.getOwnerBookings.initiate({}));
    assert.equal(result.error.status, 403);
    assert.equal(result.data, undefined);
  } finally {
    state.dispatch(baseApi.util.resetApiState());
  }
});
