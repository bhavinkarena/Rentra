import 'server-only';

import { cookies } from 'next/headers';
import { API_URL } from './client.js';

/**
 * Stream one API response straight back to the browser, bytes and all.
 *
 * WHY THESE ROUTES STILL EXIST after everything else moved to the API.
 *
 * They serve files reached by ORDINARY NAVIGATION — a download link, an
 * `<img>`, an iframe — not by `fetch`. Two things break if such a link points
 * at the API's origin directly:
 *
 *   · The session cookie is `SameSite=Strict` (and the admin one deliberately
 *     more so). A cross-site navigation does not carry it, so the download
 *     arrives as a 401 the user cannot explain.
 *   · No `fetch` is involved, so there is nowhere to attach credentials by
 *     hand the way the API client does.
 *
 * So the link stays same-origin and this forwards it, cookies included. No
 * business logic lives here: the API still decides who may read the file and
 * still writes the audit row. This is plumbing, not a second backend.
 */
export async function proxyApiFile(path, { download } = {}) {
  const jar = await cookies();
  const cookie = jar.toString();

  let upstream;
  try {
    upstream = await fetch(`${API_URL}${path}`, {
      headers: cookie ? { Cookie: cookie } : {},
      cache: 'no-store',
    });
  } catch {
    return new Response('Temporarily unavailable.', { status: 503, headers: NO_STORE });
  }

  const headers = new Headers(NO_STORE);
  for (const name of ['content-type', 'content-disposition', 'content-security-policy']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  /** Let the caller override the filename the browser saves it under. */
  if (download) headers.set('Content-Disposition', `attachment; filename="${download}"`);

  /**
   * A failure upstream is answered as plain text, never as the API's JSON
   * envelope: the browser is about to save whatever comes back to a file, and
   * a downloaded `.ics` containing an error object is worse than a message.
   */
  if (!upstream.ok) {
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.delete('Content-Disposition');
    return new Response(messageFor(upstream.status), { status: upstream.status, headers });
  }

  return new Response(upstream.body, { status: 200, headers });
}

const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function messageFor(status) {
  if (status === 401 || status === 403) return 'Please log in to the correct account.';
  if (status === 404) return 'Not found.';
  return 'Temporarily unavailable.';
}
