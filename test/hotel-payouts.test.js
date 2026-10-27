import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import swc from 'next/dist/build/swc/index.js';

function load(path, modules) {
  const { code } = swc.transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    filename: 'component.jsx',
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  });
  const fixtureModule = { exports: {} };
  new vm.Script(code).runInNewContext({
    module: fixtureModule,
    exports: fixtureModule.exports,
    require: (name) => modules[name],
  });
  return fixtureModule.exports;
}
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
};
const text = (node) =>
  typeof node === 'object' && node
    ? [node.props?.children].flat(Infinity).map(text).join(' ')
    : String(node ?? '');
function mount({ outcome = { ok: true }, fails = false, pending = false } = {}) {
  const states = [],
    calls = [];
  let index = 0,
    task,
    refreshes = 0;
  const jsx = (type, props) => ({ type, props });
  const exports = load('../components/admin/HotelPayouts.jsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      useState(initial) {
        const i = index++;
        if (!(i in states)) states[i] = initial;
        return [
          states[i],
          (value) => {
            states[i] = value;
          },
        ];
      },
      useTransition: () => [
        pending,
        (fn) => {
          task = fn();
        },
      ],
    },
    'next/navigation': {
      useRouter: () => ({
        refresh: () => {
          refreshes++;
        },
      }),
    },
    'lucide-react': {},
    '@/components/navigation/NavigationLink': { default: 'a', __esModule: true },
    '@/components/ui/button': { buttonVariants: () => 'min-h-11' },
    '@/lib/domain/booking-money': { formatINRMinor: String },
    '@/lib/actions/hotel-finance': {
      settleHotelPayoutRun: async (...args) => {
        calls.push(args);
        if (fails) throw new Error('Lost response');
        return outcome;
      },
    },
    './AdminPrimitives': {
      AdminPage: 'page',
      AdminPageHeader: 'header',
      AdminTable: 'table',
      StatusBadge: 'badge',
      AdminKpiCard: 'tile',
    },
  });
  return {
    exports,
    calls,
    render() {
      index = 0;
      return exports.CloseTestStatement({ runId: 'test-run' });
    },
    flush: () => task,
    get refreshes() {
      return refreshes;
    },
  };
}
test('hotel preview shows accounting dates and effective mode; Test history uses statement states', () => {
  const ui = mount();
  const totals = Object.fromEntries(
    [
      'stays',
      'paidMinor',
      'refundedMinor',
      'gstRentraOwesMinor',
      'commissionMinor',
      'commissionGstMinor',
      'tcsMinor',
      'tdsMinor',
      'netMinor',
    ].map((key) => [key, 0]),
  );
  const tree = ui.exports.HotelPayouts({
    preview: {
      totals,
      environment: 'test',
      payoutDate: '2030-01-02',
      periodEnd: '2030-01-01',
      held: [],
      owners: [{ ownerId: 'owner', hotels: ['Hotel'], stays: 1, netMinor: 0 }],
      lines: [{ ownerId: 'owner', payoutMode: { mode: 'manual', source: 'owner' } }],
    },
    runs: {
      items: [
        {
          id: 'closed',
          environment: 'test',
          status: 'completed',
          periodStart: '2020-01-01',
          periodEnd: '2020-01-02',
          payoutDate: '2020-01-07',
        },
        {
          id: 'open',
          environment: 'test',
          status: 'scheduled',
          periodStart: '2020-02-01',
          periodEnd: '2020-02-02',
          payoutDate: '2020-02-04',
        },
      ],
    },
  });
  const output = text(tree).replace(/\s+/g, ' ');
  assert.match(output, /Accounting statement date.*as of/);
  assert.match(output, /Effective mode: manual \(\s*owner\s*\)/);
  assert.match(output, /Closed Test statement/);
  assert.match(output, /Open Test statement/);
  assert.match(output, /7 Jan 2020/);
  assert.equal(
    find(tree, (node) => node.type === 'badge' && node.props.children === 'Paid'),
    null,
  );
  assert.ok(
    find(
      tree,
      (node) => node.type === ui.exports.CloseTestStatement && node.props.runId === 'open',
    ),
  );
});
test('Close Test statement calls the existing action without UTR, refreshes success and handles errors', async () => {
  const ui = mount();
  find(ui.render(), (node) => node.type === 'button').props.onClick();
  await ui.flush();
  assert.equal(ui.calls[0].length, 1);
  assert.equal(ui.calls[0][0], 'test-run');
  assert.equal(ui.refreshes, 1);
  assert.match(text(ui.render()), /No bank transfer recorded/);
  assert.equal(
    find(mount({ pending: true }).render(), (node) => node.type === 'button').props.disabled,
    true,
  );
  for (const options of [{ outcome: { error: 'Permission denied' } }, { fails: true }]) {
    const failed = mount(options);
    find(failed.render(), (node) => node.type === 'button').props.onClick();
    await failed.flush();
    assert.ok(find(failed.render(), (node) => node.props.role === 'alert'));
    assert.equal(failed.refreshes, 0);
  }
});
test('existing Test close transport sends an empty body, without bank reference', async () => {
  const calls = [];
  const actions = load('../lib/actions/hotel-finance.js', {
    'next/cache': { revalidatePath() {} },
    '@/lib/api/client': {
      api: {
        post: async (...args) => {
          calls.push(args);
          return { ok: true };
        },
      },
    },
  });
  await actions.settleHotelPayoutRun('test-run');
  assert.equal(calls[0][0], '/admin/payments/hotel-payout-runs/test-run/settle');
  assert.equal(Object.keys(calls[0][1]).length, 0);
});
