// Read-only credential probe. Never writes provider orders, enables a gateway or certifies checkout.
import { writeFileSync } from 'node:fs';
const report = { recordedAt: new Date().toISOString(), provider: 'razorpay', environment: 'test',
  authenticatedApi: false, webhookConfigured: Boolean(process.env.RAZORPAY_TEST_WEBHOOK_SECRET?.trim()),
  verifiedCapture: false, verifiedRefund: false, deployedWebhook: false, browserCheckout: false };
try {
  const id = process.env.RAZORPAY_TEST_KEY_ID?.trim(), secret = process.env.RAZORPAY_TEST_KEY_SECRET?.trim();
  if (!/^rzp_test_[A-Za-z0-9]+$/.test(id ?? '') || !secret) throw new Error('Missing Test credentials');
  const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` },
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  // Do not print or save response objects: they may contain customer/provider data.
  if (!response.ok) throw new Error('Provider rejected probe');
  const data = await response.json();
  report.authenticatedApi = data.entity === 'collection' && Array.isArray(data.items);
} catch { report.failure = 'Test API access was not verified; inspect local credentials/connectivity.'; }
writeFileSync('docs/rentra-customer-part19-provider.json', JSON.stringify(report, null, 2) + '\n');
console.log(report.authenticatedApi ? 'PASS authenticated Razorpay Test API read; no provider mutations.' : 'BLOCKED Razorpay Test API read.');
console.log('Release gate remains pending: actual hosted capture, refund and deployed webhook evidence are not certified by this probe.');
if (!report.authenticatedApi) process.exitCode = 1;
