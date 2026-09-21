/**
 * The one place the frontend talks to the Rentra API.
 *
 * Everything the browser and the server components need is here: the base URL,
 * cookie forwarding, the response envelope, and the error type. Nothing else
 * in the app should call `fetch` against the API directly — a second call site
 * is a second place to forget `credentials: 'include'`, and that failure mode
 * looks like "randomly signed out" rather than like a bug.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

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
  const { method = 'GET', body, headers = {}, cache, next, signal } = options;

  const request = {
    method,
    /** Sends and accepts the session cookie. Without it every call is anonymous. */
    credentials: 'include',
    headers: { ...(await serverCookieHeader()), ...headers },
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

  await relaySetCookie(response);

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

  return attachMeta(payload?.data ?? null, payload);
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
    redirect: result?.[META]?.redirect ?? null,
    revalidate: result?.[META]?.revalidate ?? [],
  };
}

const META = Symbol.for('rentra.api.meta');

function attachMeta(data, payload) {
  if (data === null || typeof data !== 'object') {
    /** A scalar cannot carry a symbol property; box it so the meta survives. */
    return payload?.redirect || payload?.revalidate
      ? Object.assign(Object(data ?? {}), {
          [META]: { redirect: payload.redirect, revalidate: payload.revalidate },
        })
      : data;
  }
  Object.defineProperty(data, META, {
    value: { redirect: payload?.redirect, revalidate: payload?.revalidate },
    enumerable: false,
  });
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
