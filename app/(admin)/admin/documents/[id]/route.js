import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema/index.js';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { audit } from '@/lib/audit';
import { signedUrl } from '@/lib/uploads/cloudinary';

/**
 * Serve one KYC document, proxied through us.
 *
 * WHY A ROUTE HANDLER, given the rule that /api/* is for external callers:
 * because this returns BYTES. A Server Component returns markup and a Server
 * Action returns a JS value — neither can stream a file. Serving binary is the
 * one job a route handler is actually for.
 *
 * WHY PROXY INSTEAD OF HANDING OVER A CLOUDINARY URL:
 * Cloudinary's time-limited tokens (`__cld_token__`) are a paid add-on. Without
 * them, `expires_at` yields a signature but no expiry — so a URL handed to a
 * browser would work forever, for anyone who got hold of it. Verified: an
 * "expired" signed URL still returned HTTP 200.
 *
 * Proxying is better than expiry anyway. Access is re-checked against the live
 * admin session on EVERY request, so revoking an admin revokes their access to
 * every document immediately rather than after some window. And no Cloudinary
 * URL ever exists in the browser, in history, or in a referrer header.
 */
export async function GET(request, { params }) {
  const { id } = await params; // Next 16: params is a Promise

  const admin = await getCurrentAdmin();
  if (!admin) {
    // 404, not 401 — do not confirm that a document id exists to a stranger.
    return new Response('Not found', { status: 404 });
  }

  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!doc || doc.deletedAt) {
    return new Response('Not found', { status: 404 });
  }

  const upstream = await fetch(signedUrl(doc.storageKey, { expiresInSeconds: 60 }));
  if (!upstream.ok || !upstream.body) {
    return new Response('Document unavailable', { status: 502 });
  }

  await audit({
    actorType: 'admin',
    actorId: admin.id,
    entity: 'document',
    entityId: doc.id,
    action: 'document_viewed',
    after: { docType: doc.docType, side: doc.side },
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': doc.mimeType ?? upstream.headers.get('content-type') ?? 'application/octet-stream',
      // Never cached anywhere: not the browser, not a CDN, not a proxy.
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      'Content-Disposition': `inline; filename="${doc.docType}_${doc.side}"`,
      // Belt and braces against this ever being embedded elsewhere.
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
