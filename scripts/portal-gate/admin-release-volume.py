"""Phase 12 volume check: inflate the disposable fixture, then time admin list/search/dashboard APIs.

Run last: it adds synthetic rows to the disposable fixture database only. Statements slower than
50 ms are taken from the PostgreSQL log (log_min_duration_statement) when PG_LOG is given.
"""
import json, os, statistics, subprocess, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4172/api/v1')
f = json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
db = urlparse(f['databaseUrl'])
assert db.hostname == '127.0.0.1' and db.path.startswith('/rentra_test_') and urlparse(api).hostname == '127.0.0.1'
out = Path(__file__).resolve().parents[2] / 'docs/evidence/admin-phase12'
USERS, PROPERTIES, ORDERS = 20000, 2000, 20000


def sql(command):
    return subprocess.run(['psql', f['databaseUrl'], '-v', 'ON_ERROR_STOP=1', '-Atc', command], check=True, capture_output=True, text=True).stdout.strip()


listing = f['ids']['listing']
sql(f"""INSERT INTO "user"(email,phone,role,account_status,name,profile_completed_at)
  SELECT 'volume-'||n||'@fixture.invalid','93'||lpad(n::text,8,'0'),CASE WHEN n%10=0 THEN 'client' ELSE 'customer' END,'active','Volume person '||n,now()
  FROM generate_series(1,{USERS}) n ON CONFLICT DO NOTHING""")
sql(f"""INSERT INTO rentable(client_id,slug,title,description,category_id,city_id,area_id,public_code,capacity,farm_size,exact_address,check_in_from,check_out_by,photos,status)
  SELECT r.client_id,'volume-property-'||n,'Volume property '||n,r.description,r.category_id,r.city_id,r.area_id,'vol'||lpad(n::text,5,'0'),r.capacity,r.farm_size,r.exact_address,r.check_in_from,r.check_out_by,'[]'::jsonb,
    (CASE WHEN n%4=0 THEN 'pending_review' ELSE 'live' END)::listing_status
  FROM rentable r CROSS JOIN generate_series(1,{PROPERTIES}) n WHERE r.id='{listing}'""")
sql(f"""WITH orders AS (
  INSERT INTO booking_order(reference,customer_id,rentable_id,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,
    amount_rent_minor,amount_fee_minor,amount_deposit_minor,idempotency_key,request_hash,state,confirmed_at,created_at)
  SELECT 'VOL-'||n,customer_id,rentable_id,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,
    amount_rent_minor,amount_fee_minor,amount_deposit_minor,gen_random_uuid(),request_hash,state,confirmed_at,now()-(n%120)*interval '1 day'
  FROM booking_order CROSS JOIN generate_series(1,{ORDERS}) n WHERE id='{f['booking']['order']}' RETURNING id,reference,created_at)
  INSERT INTO booking(reference,rentable_id,customer_id,slot,state,starts_at,ends_at,order_id,item_position,local_day,currency,time_zone,guests,units_booked,amount_rent_minor,amount_fee_minor,amount_deposit_minor)
  SELECT 'V-'||o.reference,b.rentable_id,b.customer_id,b.slot,b.state,o.created_at+interval '30 days',o.created_at+interval '30 days 8 hours',o.id,1,(o.created_at+interval '30 days')::date,
    b.currency,b.time_zone,b.guests,b.units_booked,b.amount_rent_minor,b.amount_fee_minor,b.amount_deposit_minor
  FROM orders o CROSS JOIN booking b WHERE b.order_id='{f['booking']['order']}' AND b.item_position=1""")
sql('ANALYZE')
counts = dict(x.split('|') for x in sql("""SELECT 'users',count(*) FROM "user" UNION ALL SELECT 'properties',count(*) FROM rentable
  UNION ALL SELECT 'orders',count(*) FROM booking_order UNION ALL SELECT 'visits',count(*) FROM booking""").splitlines())

ENDPOINTS = ['/admin/dashboard?period=30d&environment=live', '/admin/clients?status=all&q=Volume%20person%20199', '/admin/customers?status=all&q=Volume',
             '/admin/customers?status=all&q=9300001234', '/admin/properties?status=all&q=Volume%20property%201999', '/admin/properties?status=all&q=vol01999',
             '/admin/records?tab=all&q=VOL-19999', '/admin/records?tab=all', '/admin/records?tab=all&page=500', '/admin/records/cases?state=all&q=CASE',
             '/admin/applications?status=all&q=Fixture']
with sync_playwright() as p:
    request = p.request.new_context(extra_http_headers={'Cookie': 'rentra_admin=' + f['tokens']['full']})
    rows = []
    for path in ENDPOINTS:
        times, status = [], None
        for i in range(6):
            start = time.perf_counter(); response = request.get(api + path); elapsed = (time.perf_counter() - start) * 1000
            status = response.status
            if i:
                times.append(elapsed)  # First request warms caches.
        rows.append({'endpoint': path, 'status': status, 'medianMs': round(statistics.median(times), 1), 'maxMs': round(max(times), 1)})
        print(rows[-1], flush=True)
    request.dispose()
slow = []
if os.environ.get('PG_LOG'):
    for line in Path(os.environ['PG_LOG']).read_text(errors='ignore').splitlines():
        if 'duration:' in line and ('statement:' in line or 'execute ' in line) and 'statement: INSERT' not in line and 'statement: WITH' not in line and 'statement: ANALYZE' not in line:
            slow.append(line.split('duration:', 1)[1][:400])
(out / 'volume.json').write_text(json.dumps({'scope': 'Disposable local PostgreSQL 14, unthrottled; synthetic rows cloned from fixture records', 'rows': counts, 'endpoints': rows, 'statementsOver50ms': slow[:40]}, indent=2) + '\n')
assert all(x['status'] == 200 for x in rows), rows
