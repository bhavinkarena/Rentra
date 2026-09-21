import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposableDatabase } from './lib/disposable-database.mjs';
import { measurementSchema } from '../lib/domain/measurement.js';
import { recordMeasurement, recordWorkerHealth, pruneMeasurements } from '../lib/operations/measurement.js';
import { ingestBrowserMeasurement } from '../lib/operations/browser-ingest.js';
import { readOperations } from '../lib/operations/overview.js';

let passed = 0;
async function check(label, run) { await run(); console.log('PASS ' + label); passed++; }
await withDisposableDatabase('p19', async ({ sql, connect }) => {
  const [admin] = await sql`INSERT INTO admin_user(email,name,password_hash) VALUES('operations@fixture.invalid','Operations','unused') RETURNING id`;
  const event = { event: 'listing_viewed', source: 'browser', device: 'mobile', visits: 'single' };
  await check('bounded contract rejects private payloads and forged financial/server facts', async () => {
    for (const extra of [{ phone: 'PRIVATE_PHONE' }, { token: 'PRIVATE_TOKEN' }, { address: 'PRIVATE_ADDRESS' }, { event: 'booking_confirmed' }, { event: 'login_completed' }]) {
      assert.equal(measurementSchema.safeParse({ ...event, ...extra }).success, false);
      await assert.rejects(() => recordMeasurement(sql, { ...event, ...extra }));
    }
    await assert.rejects(() => sql`INSERT INTO customer_measurement VALUES(current_date,'phone','browser','mobile','single',1)`, error => error.code === '23514');
  });
  await check('concurrent aggregate increments, daily ceiling and retention', async () => {
    const remote = connect();
    await Promise.all(Array.from({ length: 12 }, (_, i) => recordMeasurement(i % 2 ? remote : sql, event)));
    assert.equal((await sql`SELECT count FROM customer_measurement`)[0].count, 12);
    await sql`UPDATE customer_measurement SET count=1000000`;
    await recordMeasurement(sql, event);
    assert.equal((await sql`SELECT count FROM customer_measurement`)[0].count, 1000000);
    await sql`INSERT INTO customer_measurement VALUES
      ((clock_timestamp() AT TIME ZONE 'UTC')::date-90,'listing_viewed','browser','unknown','unknown',1),
      ((clock_timestamp() AT TIME ZONE 'UTC')::date-89,'listing_viewed','browser','unknown','unknown',1)`;
    await pruneMeasurements(sql);
    assert.equal((await sql`SELECT count(*)::int n FROM customer_measurement`)[0].n, 2);
  });
  await check('ingestion opt-out, origin, size, schema, source and no raw persistence', async () => {
    const env = { RENTRA_MEASUREMENT_ENABLED: 'true', NEXT_PUBLIC_SITE_URL: 'https://fixture.invalid' };
    const req = (body = event, headers = {}) => new Request('https://fixture.invalid/api/measurement', {
      method: 'POST', headers: { origin: env.NEXT_PUBLIC_SITE_URL, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
    assert.equal((await ingestBrowserMeasurement(req(), sql, {})).status, 204);
    assert.equal((await ingestBrowserMeasurement(req(event, { origin: 'https://other.invalid' }), sql, env)).status, 403);
    assert.equal((await ingestBrowserMeasurement(req({ ...event, private: 'x'.repeat(600) }), sql, env)).status, 413);
    assert.equal((await ingestBrowserMeasurement(req({ event: 'login_completed', source: 'server' }), sql, env)).status, 400);
    assert.equal((await ingestBrowserMeasurement(req({ ...event, otp: 'PRIVATE_OTP' }), sql, env)).status, 400);
    await sql`DELETE FROM customer_measurement`;
    for (const headers of [{ DNT: '1' }, { 'Sec-GPC': '1' }]) assert.equal((await ingestBrowserMeasurement(req(event, headers), sql, env)).status, 204);
    assert.equal((await sql`SELECT count(*)::int n FROM customer_measurement`)[0].n, 0);
    assert.equal((await ingestBrowserMeasurement(req(), sql, env)).status, 204);
    assert.ok(!JSON.stringify(await sql`SELECT * FROM customer_measurement`).includes('PRIVATE_'));
  });
  await check('active admin scope, unknown health and disabled gateway defaults', async () => {
    await assert.rejects(() => readOperations(sql, randomUUID()), error => error.code === 'ADMIN_REQUIRED');
    await assert.rejects(() => readOperations(sql, 'customer'), error => error.code === 'ADMIN_REQUIRED');
    const data = await readOperations(sql, admin.id, {});
    assert.equal(data.gateway.enabled, false);
    assert.equal(data.alerts.filter(a => a.code.endsWith('worker_unhealthy')).length, 2);
    assert.deepEqual(data.money, []);
    assert.ok(Object.values(data.live).every(value => value === '0'));
  });
  await check('worker success, failure, stale heartbeats and last successful tick', async () => {
    await recordWorkerHealth(sql, 'payments', true);
    await recordWorkerHealth(sql, 'notifications', true);
    assert.equal((await readOperations(sql, admin.id)).alerts.length, 0);
    await recordWorkerHealth(sql, 'payments', false);
    let data = await readOperations(sql, admin.id);
    assert.ok(data.health.find(h => h.service === 'payments').last_success_at);
    assert.ok(data.alerts.some(a => a.code === 'payments_worker_unhealthy'));
    await sql`UPDATE service_health SET checked_at=clock_timestamp()-interval '3 minutes' WHERE service='notifications'`;
    data = await readOperations(sql, admin.id);
    assert.equal(data.alerts.length, 2);
    await assert.rejects(() => recordWorkerHealth(sql, 'PRIVATE_TOKEN', true));
  });
  await check('operational thresholds, private DTO and immediate admin revocation', async () => {
    await Promise.all(Array.from({ length: 10 }, () => recordMeasurement(sql, { event: 'inventory_conflict', source: 'server' })));
    await sql`INSERT INTO customer_otp_challenge(id,phone,browser_hash,code_hash,delivery_mode,expires_at)
      VALUES(${randomUUID()},'9000019001',${'a'.repeat(64)},${'b'.repeat(64)},'twilio',now()+interval '5 minutes')`;
    const data = await readOperations(sql, admin.id);
    assert.ok(data.alerts.some(a => a.code === 'inventory_conflict' && a.count === 10));
    assert.equal(data.signals.otp_delivery_failures, 1);
    assert.ok(!JSON.stringify(data).includes('9000019001'));
    await sql`UPDATE admin_user SET is_active=false WHERE id=${admin.id}`;
    await assert.rejects(() => readOperations(sql, admin.id), error => error.code === 'ADMIN_REQUIRED');
  });
});
console.log(`${passed} operations groups passed; disposable database removed.`);
