import { sql } from '../lib/db/index.js';
import { runPaymentJobs } from '../lib/payments/jobs.js';
import { runNotificationJobs } from '../lib/notifications/jobs.js';
import { setTimeout } from 'node:timers/promises';

let stopping=false;
const once=process.argv.includes('--once');
process.on('SIGINT',()=>{stopping=true;});
process.on('SIGTERM',()=>{stopping=true;});
try {
  console.log('[worker] Razorpay Test reconciliation, inventory expiry and booking notifications');
  do {
    try {
      console.log('[worker] payments',await runPaymentJobs(sql));
    }
    catch {
      console.error(once?'[worker] tick failed':'[worker] tick failed; retrying on next interval');
      if (once) process.exitCode=1;
    }
    try { console.log('[worker] notifications',await runNotificationJobs(sql)); }
    catch {
      console.error('[worker] notification tick failed; queued messages retained');
      if (once) process.exitCode=1;
    }
    if (once) break;
    if (!stopping) await setTimeout(10000);
  } while (!stopping);
} finally { await sql.end({timeout:5}); }
