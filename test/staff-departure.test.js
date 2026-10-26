import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import swc from 'next/dist/build/swc/index.js';

const visit = {
  id: 'visit',
  orderId: 'order',
  reference: 'STAY',
  propertyTitle: 'Hotel',
  slot: 'stay',
  state: 'confirmed',
  guests: 2,
  originalGuests: 4,
  date: '2026-10-26',
  guest: null,
  rooms: [
    {
      id: 'a',
      name: 'Deluxe',
      state: 'stayed',
      departedAt: '2026-10-26T09:00:00Z',
      inventoryEnd: '2026-10-27',
      checkIn: '2026-10-25',
      checkOut: '2026-10-29',
    },
    {
      id: 'b',
      name: 'Standard',
      state: 'booked',
      departedAt: null,
      checkIn: '2026-10-25',
      checkOut: '2026-10-29',
    },
  ],
};
const text = (node) =>
  typeof node === 'object' && node
    ? [node.props?.children].flat(Infinity).map(text).join(' ')
    : String(node ?? '');
async function render(path, data) {
  const { code } = swc.transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    filename: 'page.jsx',
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  });
  const jsx = (type, props) => ({ type, props }),
    stub = {};
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'node:crypto': { randomUUID: () => 'request' },
    '@/components/navigation/NavigationLink': { default: 'a', __esModule: true },
    '@/lib/api/endpoints': { staffApi: { visits: async () => data, visit: async () => data } },
    '@/lib/api/session': {
      staffSession: async () => ({ staff: { name: 'Caretaker', properties: [], permissions: {} } }),
    },
    '@/lib/api/page-state': { settle: async (promise) => ({ data: await promise }) },
    '@/components/portal/PortalState': { default: 'state', __esModule: true },
    '@/components/staff/StaffForms': { StaffSignOut: 'signout' },
    '@/lib/domain/booking-dates': {
      propertyToday: () => '2026-10-26',
      formatLocalDate: (v) => v,
      addLocalDays: (v) => v,
    },
    '@/components/booking/GuestContactLinks': { default: 'contact', __esModule: true },
    '@/components/booking/VisitEvidence': { VisitEvidence: 'evidence' },
    '@/components/customer/VisitLifecycle': { VisitLifecycle: 'lifecycle' },
    '@/lib/actions/staff': { recordStaffVisit: () => {}, reportStaffIncident: () => {} },
  };
  new vm.Script(code).runInNewContext({
    module: stub,
    exports: (stub.exports = {}),
    require: (name) => {
      assert.ok(name in modules, name);
      return modules[name];
    },
  });
  return stub.exports.default({
    searchParams: Promise.resolve({}),
    params: Promise.resolve({ orderId: 'order' }),
  });
}
test('assigned staff list displays active guest count, room identities and early departure', async () => {
  const ui = await render('../app/(staff)/staff/page.js', {
    tab: 'today',
    counts: { today: 1, action_needed: 1, upcoming: 1, past: 0 },
    items: [visit],
  });
  const output = text(ui).replace(/\s+/g, ' ');
  assert.match(output, /2 guest\(s\)/);
  assert.match(output, /Room\s+1\s*:\s*Deluxe/);
  assert.match(output, /Room\s+2\s*:\s*Standard/);
  assert.match(output, /ended early/);
  assert.doesNotMatch(output, /Guest 1|refund|payment|rent|fee|price/i);
});
test('assigned staff detail preserves original facts alongside current occupancy and room departure', async () => {
  const ui = await render('../app/(staff)/staff/visits/[orderId]/page.js', {
    propertyTitle: 'Hotel',
    reference: 'STAY',
    orderId: 'order',
    timeZone: 'Asia/Kolkata',
    visits: [visit],
    houseRules: [],
    canRecord: false,
  });
  const output = text(ui).replace(/\s+/g, ' ');
  assert.match(output, /2 guest\(s\)/);
  assert.match(output, /Original booked guests: 4/);
  assert.match(output, /2026-10-25 to 2026-10-29/);
  assert.match(output, /Room\s+1\s*:\s*Deluxe/);
  assert.match(output, /unused nights released from 2026-10-27/);
  assert.doesNotMatch(output, /Guest 1|refund|payment|rent|fee|price/i);
});
