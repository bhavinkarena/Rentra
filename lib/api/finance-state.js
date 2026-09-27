import 'server-only';
import { ApiError } from './client';
import { settle } from './page-state';
export async function settleFinance(request) {
  const result = await request
    .then(
      (data) => ({ data }),
      (error) => {
        if (error instanceof ApiError && error.status === 400) return { invalid: error.message };
        throw error;
      },
    )
    .catch((error) => settle(Promise.reject(error)));
  return result;
}
