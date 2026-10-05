"""Phase 12 performance baseline: cold-load JavaScript and interaction timings.

Compares the current production build with a pre-redesign build (commit 90b0900) served against
the same disposable fixture API. Local, unthrottled numbers: use them for relative comparison and
budgets on transferred bytes, not as production latency.
"""
import json, os, re, statistics, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

builds = {'current': os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3172'), 'preRedesign': os.environ.get('GATE_BASELINE_ORIGIN', 'http://127.0.0.1:3173')}
assert all(urlparse(x).hostname in ['localhost', '127.0.0.1'] for x in builds.values())
f = json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
out = Path(__file__).resolve().parents[2] / 'docs/evidence/admin-phase12'
out.mkdir(parents=True, exist_ok=True)
RUNS = int(os.environ.get('PERF_RUNS', '3'))
ROUTES = ['/admin', '/admin/bookings', '/admin/bookings/' + f['booking']['order'], '/admin/customers', '/admin/finance/payments',
          '/admin/support', '/admin/properties', '/admin/search?q=Search%20fixture']
METRICS = """() => new Promise(done => {
  let lcp = 0;
  new PerformanceObserver(list => { for (const e of list.getEntries()) lcp = e.startTime; }).observe({type: 'largest-contentful-paint', buffered: true});
  setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const scripts = performance.getEntriesByType('resource').filter(e => e.initiatorType === 'script' || /\\.js(\\?|$)/.test(e.name));
    done({ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, lcp,
      documentBytes: nav.encodedBodySize, scriptCount: scripts.length,
      scriptBytes: scripts.reduce((t, e) => t + e.encodedBodySize, 0), scriptDecodedBytes: scripts.reduce((t, e) => t + e.decodedBodySize, 0)});
  }, 300);
})"""


def idle(page):
    # Sheet routes can keep a prefetch open; a bounded wait keeps timings comparable.
    try:
        page.wait_for_load_state('networkidle', timeout=5000)
    except Exception:
        pass


def median(rows, key):
    return round(statistics.median(x[key] for x in rows), 1)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    result = {'scope': 'Local production builds, same disposable API, unthrottled, cold cache per run; medians of ' + str(RUNS) + ' runs', 'routes': [], 'interactions': {}}
    try:
        for route in ROUTES:
            row = {'route': re.sub('[0-9a-f-]{36}', '[orderId]', route)}
            for build, origin in builds.items():
                samples = []
                for _ in range(RUNS):
                    c = browser.new_context(viewport={'width': 1280, 'height': 900})
                    c.add_cookies([{'name': 'rentra_admin', 'value': f['tokens']['full'], 'url': origin}])
                    page = c.new_page()
                    response = page.goto(origin + route, wait_until='load')
                    idle(page)
                    samples.append({**page.evaluate(METRICS), 'status': response.status, 'h1': page.locator('h1').count() > 0})
                    c.close()
                row[build] = {k: median(samples, k) for k in ['ttfb', 'domContentLoaded', 'load', 'lcp', 'documentBytes', 'scriptCount', 'scriptBytes', 'scriptDecodedBytes']}
                row[build]['status'] = samples[0]['status']
                row[build]['rendered'] = all(x['h1'] for x in samples)
            result['routes'].append(row)
            print(row['route'], 'JS KiB', round(row['current']['scriptBytes'] / 1024, 1), 'vs', round(row['preRedesign']['scriptBytes'] / 1024, 1), flush=True)

        # Warm interactions on the current build only; the pre-redesign build had no booking sheet.
        c = browser.new_context(viewport={'width': 1280, 'height': 900})
        c.add_cookies([{'name': 'rentra_admin', 'value': f['tokens']['full'], 'url': builds['current']}])
        page = c.new_page()
        timings = {'openBookingSheet': [], 'switchSheetTab': [], 'filterBookings': []}
        for _ in range(RUNS + 2):
            page.goto(builds['current'] + '/admin/bookings?tab=all'); idle(page)
            start = time.perf_counter()
            page.get_by_role('link', name=re.compile('^Open booking')).first.click()
            expect(page.get_by_role('dialog')).to_be_visible()
            expect(page.get_by_role('dialog').get_by_role('navigation', name='Record sections')).to_be_visible()
            timings['openBookingSheet'].append((time.perf_counter() - start) * 1000)
            idle(page)
            start = time.perf_counter()
            page.get_by_role('dialog').get_by_role('navigation', name='Record sections').get_by_role('link').nth(1).click()
            page.wait_for_url('**recordTab=**')
            expect(page.get_by_role('dialog').get_by_role('navigation', name='Record sections').locator('[aria-current="page"]')).to_have_count(1)
            timings['switchSheetTab'].append((time.perf_counter() - start) * 1000)
            page.goto(builds['current'] + '/admin/bookings?tab=all'); idle(page)
            start = time.perf_counter()
            page.get_by_label(re.compile('^Search'), exact=False).first.fill('TODAY-ORDER-2')
            page.get_by_label(re.compile('^Search'), exact=False).first.press('Enter')
            page.wait_for_url('**q=TODAY-ORDER-2**')
            idle(page)
            timings['filterBookings'].append((time.perf_counter() - start) * 1000)
        # First run warms route chunks; report the remaining runs.
        result['interactions'] = {k: {'medianMs': round(statistics.median(v[1:]), 1), 'maxMs': round(max(v[1:]), 1), 'runs': len(v) - 1} for k, v in timings.items()}
        c.close()
    finally:
        (out / 'performance.json').write_text(json.dumps(result, indent=2) + '\n')
        browser.close()
