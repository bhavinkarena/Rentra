import { proxyApiFile } from '@/lib/api/proxy';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Story 5.4: report evidence; the API allows admin or the reporter only. */
export async function GET(request, { params }) {
  const { reportId, attachmentId } = await params;
  if (!UUID.test(reportId) || !UUID.test(attachmentId))
    return new Response('Not found.', { status: 404 });
  const download = new URL(request.url).searchParams.get('download') === '1' ? '?download=1' : '';
  return proxyApiFile(
    `/partner/reviews/reports/${reportId}/attachments/${attachmentId}${download}`,
  );
}
