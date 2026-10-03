import { proxyApiFile } from '@/lib/api/proxy';
export async function GET(request, { params }) {
  const { feed } = await params;
  if (!/^[A-Za-z0-9_-]{43}\.ics$/.test(feed)) return new Response('Not found', { status: 404 });
  return proxyApiFile(`/ical/${feed}`);
}
