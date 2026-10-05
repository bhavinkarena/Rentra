import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../lib/api/client.js';

test('an ended admin session explains recovery and that the entry is kept', () => {
  const error = new ApiError({
    status: 401,
    code: 'ADMIN_REQUIRED',
    message: 'Admin sign-in required.',
  });
  assert.match(error.message, /entry is kept/);
  assert.match(error.message, /\/admin\/login/);
  assert.equal(
    new ApiError({ status: 401, code: 'AUTH_REQUIRED', message: 'Sign in.' }).message,
    'Sign in.',
  );
});
