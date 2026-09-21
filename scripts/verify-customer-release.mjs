import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Consolidates existing acceptance tests, not a substitute for a hosted provider run.
const suites = {
  foundation: ['A03','A06','A08','A09','A13'], reservations: ['A03','A05','A06','A10'],
  payments: ['A13','A17','A18'], quotes: ['A04','A05','A07','A08'],
  identity: ['A01','A02','A14'], account: ['A14'], saved: ['A15'], search: ['A07','A16'],
  listing: ['A14','A16'], picker: ['A03','A08','A09','A16'], checkout: ['A01','A04','A05','A10','A11','A13','A17','A18'],
  records: ['A10','A14'], cancellation: ['A12','A13','A18'], lifecycle: ['A09','A11','A14'],
  reviews: ['A15'], support: ['A14','A16'], operations: ['A13','A14'],
};
const browser = process.argv.includes('--browser');
if (browser && !process.env.CUSTOMER_BROWSER_DRIVER) throw new Error('Set CUSTOMER_BROWSER_DRIVER for browser acceptance.');
if (browser) suites.quality = ['A14','A16'];
const report = { recordedAt: new Date().toISOString(), mode: browser ? 'fixture database and browser' : 'fixture database/domain only',
  providerTransport: 'deterministic fixtures; no actual provider payment', releaseGate: 'pending actual hosted Test capture/refund and deployed signed webhook evidence', suites: [] };
const output = 'docs/rentra-customer-part19-acceptance.json';
const queue = Object.entries(suites);
async function worker() {
  while (queue.length) {
    const [name, acceptance] = queue.shift();
    const env = { ...process.env, RENTRA_MEASUREMENT_ENABLED: 'false', NEXT_PUBLIC_RENTRA_MEASUREMENT_ENABLED: 'false' };
    if (!browser) { delete env.CUSTOMER_BROWSER_DRIVER; delete env.CUSTOMER_CHECKOUT_BROWSER; }
    else env.CUSTOMER_CHECKOUT_BROWSER = '1';
    delete env.CUSTOMER_SUPPORT_BROWSER_ONLY;
    const log = createWriteStream(join(tmpdir(), `rentra-part19-${name}.log`));
    const started = Date.now();
    console.log('RUN ' + name);
    const args = ['--import','./scripts/register-alias.mjs','--env-file=.env.local',`scripts/verify-customer-${name}.mjs`];
    const child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
    let tail = '';
    child.stdout.on('data', chunk => { log.write(chunk); tail = (tail + chunk).slice(-5000); });
    child.stderr.on('data', chunk => log.write(chunk));
    const code = await new Promise(resolve => { child.once('error', () => resolve(-1)); child.once('exit', resolve); });
    log.end();
    const result = { name, acceptance, status: code === 0 ? 'passed' : 'failed', exitCode: code,
      seconds: Math.round((Date.now()-started)/1000), summary: code === 0 ? tail.split(/\r?\n/).filter(line => /groups passed|PASS.*rendered|checks passed/.test(line)).at(-1) ?? 'Script exited successfully' : 'See local temporary log; source errors are not copied into the public report.' };
    report.suites.push(result);
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${result.status.toUpperCase()} ${name} (${result.seconds}s)`);
  }
}
// Browser servers/builds run serially; independent DB fixtures can run two at a time.
await Promise.all(Array.from({ length: browser ? 1 : 2 }, worker));
report.fixtureRegressionPassed = report.suites.every(suite => suite.status === 'passed');
report.acceptance = Object.fromEntries(Array.from({ length: 18 }, (_, index) => {
  const id = `A${String(index+1).padStart(2,'0')}`;
  const tests = report.suites.filter(suite => suite.acceptance.includes(id));
  return [id, { fixtureStatus: tests.length && tests.every(test => test.status === 'passed') ? 'passed' : 'failed', suites: tests.map(test => test.name),
    ...( ['A17','A18'].includes(id) ? { providerStatus: 'pending actual Test evidence' } : {} ) }];
}));
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(report.fixtureRegressionPassed ? 'PASS consolidated fixture regression. Provider release gate remains pending.' : 'FAIL consolidated fixture regression.');
if (!report.fixtureRegressionPassed) process.exitCode = 1;
