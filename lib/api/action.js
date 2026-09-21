import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, resultMeta } from './client.js';

/**
 * The bridge between a `useActionState` form and an API call.
 *
 * Every form in this app was written against Server Actions that returned
 * `{ ok }` on success, `{ error }` on a domain refusal and `{ errors }` on a
 * field problem. Those actions now live in the API, and its envelope carries
 * exactly the same three outcomes — so this maps one onto the other and the
 * form components did not have to change.
 *
 * Two side-channel fields come back with a success and are acted on here
 * rather than passed to the caller:
 *
 *   · `revalidate` — the paths the API says went stale. Replayed against the
 *     Next cache, which is the whole reason the API bothers to report them.
 *   · `redirect`   — where the action says to go next. Thrown as a real
 *     navigation, because that is what the original action did.
 *
 * `redirect()` works by throwing, so it must be called outside the try block
 * below — catching it would turn a successful sign-in into an error message.
 */
export async function runApiAction(call) {
  let result;

  try {
    result = await call();
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;

    /**
     * The API returns the state a form needs to re-render alongside the
     * failure, so it is spread back in rather than dropped — otherwise a
     * rejected multi-step form loses the step it was on.
     */
    const state = error.data && typeof error.data === 'object' ? error.data : {};

    return error.isValidation
      ? { ...state, errors: error.fields, error: error.message }
      : { ...state, error: error.message };
  }

  const { redirect: location, revalidate } = resultMeta(result);
  for (const path of revalidate) revalidatePath(path);
  if (location) redirect(location);

  return result ?? {};
}
