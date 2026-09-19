import { sql } from '../lib/db/index.js';
import { runPaymentJobs } from '../lib/payments/jobs.js';
import { setTimeout } from 'node:timers/promises';

let stopping=false;
const once=process.argv.includes('--once');
process.on('SIGINT',()=>{stopping=true;});
process.on('SIGTERM',()=>{stopping=true;});
try {
  console.log('[worker] Razorpay Test reconciliation and inventory expiry');
  do {
    try { console.log('[worker] tick',await runPaymentJobs(sql)); }
    catch {
      console.error(once?'[worker] tick failed':'[worker] tick failed; retrying on next interval');
      if (once) process.exitCode=1;
    }
    if (once) break;
    if (!stopping) await setTimeout(10000);
  } while (!stopping);
} finally { await sql.end({timeout:5}); }
