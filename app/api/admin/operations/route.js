import { getCurrentAdmin } from '@/lib/auth/admin';
import { sql } from '@/lib/db';
import { readOperations } from '@/lib/operations/overview';

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: 'ADMIN_REQUIRED' }, { status: 401, headers });
  try { return Response.json(await readOperations(sql, admin.id), { headers }); }
  catch { return Response.json({ error: 'OPERATIONS_UNAVAILABLE' }, { status: 503, headers }); }
}
