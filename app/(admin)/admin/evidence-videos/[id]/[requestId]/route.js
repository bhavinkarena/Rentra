import { proxyApiFile } from '@/lib/api/proxy';

/**
 * Story 1.3: play a submitted property video. Same-origin so the admin cookie
 * travels; the API re-checks the session, streams from a 60-second signed URL
 * and audits the view. No storage URL reaches the browser.
 */
export async function GET(request, { params }) {
  const { id, requestId } = await params;
  // ponytail: no Range passthrough, so seeking re-downloads; add it if reviewers scrub long videos.
  return proxyApiFile(`/admin/properties/${id}/evidence-requests/${requestId}/video`);
}
