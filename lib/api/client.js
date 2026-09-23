/**
 * The one place the frontend talks to the Rentra API.
 *
 * Everything the browser and the server components need is here: the base URL,
 * cookie forwarding, the response envelope, and the error type. Nothing else
 * in the app should call `fetch` against the API directly — a second call site
 * is a second place to forget `credentials: 'include'`, and that failure mode
 * looks like "randomly signed out" rather than like a bug.
 */

import { API_URL } from './config.js';
export { API_URL } from './config.js';

/**
 * A non-2xx response, carrying the API's own error shape.
 *
 * `code` is the stable, machine-readable reason and is what you branch on.
 * `message` is written for a person and will be reworded — never compare it.
 * `fields` is the { field: message } map a form renders, present on a 422.
 */
export class ApiError extends Error {
  constructor({ status, code, message, fields, data }) {
    super(message ?? code ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    /** Actions return the state the form needs to re-render alongside the error. */
    this.data = data;
  }

  get isValidation() {
    return this.status === 422;
  }

  get isAuth() {
    return this.status === 401;
  }
}

/**
 * Call the API and unwrap the envelope.
 *
 * Returns the `data` field on success. The envelope's `redirect` and
 * `revalidate` are attached to the returned value as non-enumerable
 * properties, so callers that care can read them and callers that do not are
 * unaffected — see `resultMeta`.
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, headers = {}, cache, next, signal, anonymous = false } = options;

  /**
   * `anonymous` is what keeps the public pages statically rendered.
   *
   * Reading `cookies()` on the server opts the whole route out of static
   * rendering — one call is enough to turn an ISR-cached page into a
   * per-request render. The homepage, the city landing pages and the listing
   * page read nothing but public data, so they must not touch the cookie jar
   * at all. Endpoints that do depend on the session leave this off and are
   * dynamic, which is correct for them.
   */
  const request = {
    method,
    /** Sends and accepts the session cookie. Without it every call is anonymous. */
    credentials: anonymous ? 'omit' : 'include',
    headers: { ...(anonymous ? {} : await serverCookieHeader()), ...headers },
    signal,
    ...(cache ? { cache } : {}),
    ...(next ? { next } : {}),
  };

  if (body instanceof FormData) {
    /**
     * Never set Content-Type for FormData: the browser has to append the
     * multipart boundary itself, and setting it by hand produces a body the
     * server cannot parse.
     */
    request.body = body;
  } else if (body !== undefined) {
    request.headers['Content-Type'] = 'application/json';
    request.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, request);
  } catch (cause) {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
      cause,
    });
  }

  /** Nothing to relay when the call never carried a session in the first place. */
  if (!anonymous) await relaySetCookie(response);

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new ApiError({
      status: response.status,
      code: payload?.code,
      message: payload?.message,
      fields: payload?.errors,
      data: payload?.data,
    });
  }

  /**
   * A READ that answers with a redirect is the API refusing to render this
   * page for this actor — "finish onboarding first", "that checkout moved".
   * It arrives as a 200 with `data: null` and a `redirect`, because the
   * ported code expressed it by calling Next's `redirect()`.
   *
   * Honour it here rather than handing the page a null it will crash on.
   * Only for GET: a write's redirect is where the form should go NEXT, and
   * `runApiAction` navigates after it has read the rest of the result.
   */
  if (method === 'GET' && payload?.redirect && payload?.data == null) {
    await serverRedirect(payload.redirect);
  }

  return attachMeta(payload?.data ?? null, payload);
}

/**
 * Perform a Next navigation, on the server only.
 *
 * `redirect()` works by throwing, and the throw must not be caught by the
 * caller's own error handling — which is why this is the last thing to run.
 * In the browser there is no such mechanism and the caller decides, so the
 * redirect is left in the metadata instead.
 */
async function serverRedirect(location) {
  if (typeof window !== 'undefined') return;
  const { redirect } = await import('next/navigation');
  redirect(location);
}

export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: 'PATCH', body }),
  del: (path, body, options) => apiFetch(path, { ...options, method: 'DELETE', body }),
};

/**
 * The envelope's side-channel fields for a result.
 *
 *   `redirect`   — where the action says to go next.
 *   `revalidate` — the paths whose data just went stale.
 *
 * Returned separately rather than merged into the data, so a result that
 * happens to have a `redirect` key of its own is never shadowed.
 */
export function resultMeta(result) {
  return {
    redirect: META.get(result)?.redirect ?? null,
    revalidate: META.get(result)?.revalidate ?? [],
  };
}

/**
 * Kept OUTSIDE the data, in a WeakMap.
 *
 * The obvious implementation hangs a symbol property off the returned object,
 * and it does not survive contact with Next: a Server Component may only pass
 * plain objects to a Client Component, and a symbol property makes the whole
 * prop unserialisable — "Only plain objects can be passed to Client
 * Components". Since nearly every page hands this data straight to a client
 * component, the metadata cannot live on the object at all.
 *
 * A WeakMap keeps the association without touching the value, and lets the
 * entry be collected with it.
 */
const META = new WeakMap();

function attachMeta(data, payload) {
  if (!payload?.redirect && !payload?.revalidate) return data;
  /** Only an object can key a WeakMap; a scalar body carries no meta. */
  if (data === null || typeof data !== 'object') return data;

  META.set(data, { redirect: payload.redirect, revalidate: payload.revalidate });
  return data;
}

/**
 * On the server there is no ambient cookie jar for `fetch`, so the incoming
 * request's cookies are forwarded by hand. In the browser this is a no-op —
 * `credentials: 'include'` already does it, and reading next/headers there
 * would be an error.
 */
async function serverCookieHeader() {
  if (typeof window !== 'undefined') return {};
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const cookie = jar.toString();
  return cookie ? { Cookie: cookie } : {};
}

/**
 * Relay the API's Set-Cookie back to the browser when the call was made
 * server-side.
 *
 * Without this, signing in from a Server Action would succeed at the API and
 * the browser would never receive the session cookie — the user would submit a
 * correct OTP and land back on the login page. Only writable during a Server
 * Action or Route Handler, so a failure here is swallowed: a render-time read
 * has no cookie to set and should not crash the page.
 */
async function relaySetCookie(response) {
  if (typeof window !== 'undefined') return;

  const raw = response.headers.getSetCookie?.() ?? [];
  if (!raw.length) return;

  try {
    const { cookies } = await import('next/headers');
    const jar = await cookies();
    for (const entry of raw) {
      const [pair, ...attributes] = entry.split(';');
      const index = pair.indexOf('=');
      if (index < 1) continue;
      jar.set(
        pair.slice(0, index).trim(),
        decodeURIComponent(pair.slice(index + 1).trim()),
        parseAttributes(attributes),
      );
    }
  } catch {
    /* Not in a writable cookie scope — a render-time read. Nothing to relay. */
  }
}

function parseAttributes(attributes) {
  const options = {};
  for (const attribute of attributes) {
    const [name, value = ''] = attribute.split('=');
    switch (name.trim().toLowerCase()) {
      case 'max-age':
        options.maxAge = Number(value);
        break;
      case 'expires':
        options.expires = new Date(value);
        break;
      case 'path':
        options.path = value;
        break;
      case 'domain':
        options.domain = value;
        break;
      case 'samesite':
        options.sameSite = value.toLowerCase();
        break;
      case 'httponly':
        options.httpOnly = true;
        break;
      case 'secure':
        options.secure = true;
        break;
      default:
        break;
    }
  }
  return options;
}
