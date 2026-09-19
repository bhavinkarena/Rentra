import { sql } from '@/lib/db';
import { ingestRazorpayEvent } from '@/lib/payments/webhooks';

export const runtime = 'nodejs';
export async function POST(request) {
  const headers = { 'Cache-Control':'no-store' };
  try {
    const chunks=[];
    let size=0;
    if (!request.body) return Response.json({error:'Invalid event'},{status:400,headers});
    const reader=request.body.getReader();
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      size+=value.byteLength;
      if (size>262144) { await reader.cancel(); return Response.json({error:'Event too large'},{status:413,headers}); }
      chunks.push(Buffer.from(value));
    }
    await ingestRazorpayEvent(sql,Buffer.concat(chunks),request.headers.get('x-razorpay-signature'),request.headers.get('x-razorpay-event-id'));
    return Response.json({received:true},{headers});
  } catch(error) {
    const invalid=['INVALID_EVENT','INVALID_SIGNATURE','EVENT_ID_CONFLICT'].includes(error.code);
    return Response.json({error:invalid?'Invalid event':'Event storage unavailable'},{status:invalid?400:503,headers});
  }
}
