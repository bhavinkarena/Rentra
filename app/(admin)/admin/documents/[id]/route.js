import { proxyApiFile } from '@/lib/api/proxy';

/**
 * Serve one KYC document to a reviewer.
 *
 * The bytes come from the API, which re-checks the live admin session on
 * every request, fetches the asset from private Cloudinary storage and writes
 * the `document_viewed` audit row. None of that happens here — this route
 * exists only so the link is same-origin and therefore carries the admin
 * cookie, which a cross-site `<a>` or `<img>` would not.
 *
 * A missing document answers 404 rather than 403, so a stranger cannot learn
 * that a document id exists by probing.
 */
export async function GET(request, { params }) {
  const { id } = await params; // Next 16: params is a Promise
  return proxyApiFile(`/admin/documents/${id}/file`);
}
