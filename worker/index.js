/**
 * Rentra worker — everything Next.js cannot hold open.
 *
 * Deployed separately (Railway / Render / a small VM), versioned in this repo,
 * importing the SAME lib/domain and lib/db as the app. That shared domain
 * layer is the whole reason this is one repo and not two.
 *
 * Queues to build in later customer parts:
 *   booking:expire        expire checkout holds under inventory locks (Part 11)
 *   deposit:release       verified real deposit refunds only (Part 22)
 *   payout:settle         eligible captured allocations only (Part 21)
 *   listing:freshness     nudge, then auto-hide after 30 days unconfirmed
 *   whatsapp:send         committed notification outbox delivery (Part 15)
 *
 * Run: node worker/index.js
 */
import { PAYMENT_RUNTIME } from '../lib/payments/config.js';

async function main() {
  console.log('[worker] Rentra worker starting');

  // TODO: replace with BullMQ once REDIS_URL is provisioned:
  //   const queue = new Queue('booking:expire', { connection: { url: REDIS_URL } })
  //   new Worker('booking:expire', handler, { connection })

  console.log('[worker] payment mode:', PAYMENT_RUNTIME.mode, '— no real collection/refund/payout handlers enabled');

  // TODO: replace this heartbeat with real BullMQ workers in Phase 2.
  // Without a long-running process, Render flags "Application exited early."
  console.log('[worker] waiting for jobs (heartbeat every 60s)');
  setInterval(() => {
    console.log('[worker] heartbeat — awaiting BullMQ queues');
  }, 60_000);
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
