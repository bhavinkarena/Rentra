/**
 * Rentra worker — everything Next.js cannot hold open.
 *
 * Deployed separately (Railway / Render / a small VM), versioned in this repo,
 * importing the SAME lib/domain and lib/db as the app. That shared domain
 * layer is the whole reason this is one repo and not two.
 *
 * Queues to build, in Phase 2 order:
 *   booking:expire        12-hour acceptance timer, then auto-refund in full
 *   deposit:release       auto-refund once the inspection window closes clean
 *   payout:settle         split payout on T+1, with TDS/TCS fields recorded
 *   listing:freshness     nudge, then auto-hide after 30 days unconfirmed
 *   whatsapp:send         confirmations, reminders, one-tap BLOCK replies
 *
 * Run: node worker/index.js
 */
import { calculateRefund } from '../lib/domain/pricing.js';

async function main() {
  console.log('[worker] Rentra worker starting');

  // TODO: replace with BullMQ once REDIS_URL is provisioned:
  //   const queue = new Queue('booking:expire', { connection: { url: REDIS_URL } })
  //   new Worker('booking:expire', handler, { connection })

  // Proof the shared domain layer imports cleanly from outside Next.js —
  // the same function the checkout page and webhook handler use.
  const demo = calculateRefund({
    tier: 'moderate',
    daysUntilCheckIn: 5,
    rent: 8000,
    fee: 640,
    deposit: 3000,
  });
  console.log('[worker] shared domain check — 5-day moderate refund:', demo);
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
