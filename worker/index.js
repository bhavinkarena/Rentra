import { sql } from '../lib/db/index.js';
import { runPaymentJobs } from '../lib/payments/jobs.js';
import { runNotificationJobs } from '../lib/notifications/jobs.js';
import { setTimeout } from 'node:timers/promises';
import { recordWorkerHealth, pruneMeasurements } from '../lib/operations/measurement.js';

let stopping=false;
let lastMeasurementPrune = 0;
const once=process.argv.includes('--once');
process.on('SIGINT',()=>{stopping=true;});
process.on('SIGTERM',()=>{stopping=true;});
try {
  console.log('[worker] Razorpay Test reconciliation, inventory expiry and booking notifications');
  do {
    try {
      console.log('[worker] payments',await runPaymentJobs(sql));
      await recordWorkerHealth(sql,'payments',true);
    }
    catch {
      try { await recordWorkerHealth(sql,'payments',false); } catch { /* Database outage remains a stale heartbeat. */ }
      console.error(once?'[worker] tick failed':'[worker] tick failed; retrying on next interval');
      if (once) process.exitCode=1;
    }
    try { console.log('[worker] notifications',await runNotificationJobs(sql)); await recordWorkerHealth(sql,'notifications',true); }
    catch {
      try { await recordWorkerHealth(sql,'notifications',false); } catch { /* Never log private source errors. */ }
      console.error('[worker] notification tick failed; queued messages retained');
      if (once) process.exitCode=1;
    }
    if (Date.now() - lastMeasurementPrune >= 3600000) {
      try { await pruneMeasurements(sql); lastMeasurementPrune = Date.now(); }
      catch { console.error('[worker] measurement retention failed'); }
    }
    if (once) break;
    if (!stopping) await setTimeout(10000);
  } while (!stopping);
} finally { await sql.end({timeout:5}); }
