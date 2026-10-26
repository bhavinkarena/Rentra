import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
import swc from 'next/dist/build/swc/index.js';

const { code } = swc.transformSync(
  readFileSync(new URL('../components/customer/CancelVisits.jsx', import.meta.url), 'utf8'),
  {
    filename: 'CancelVisits.jsx',
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  },
);
const record = {
  id: 'order',
  title: 'Hotel',
  visits: [{ id: 'stay', slot: 'stay', label: 'Stay', state: 'confirmed' }],
  stay: {
    checkIn: '2026-10-01',
    checkOut: '2026-10-03',
    rooms: [
      { id: 'a', state: 'booked', name: 'Deluxe', roomMinor: 1000, taxMinor: 0 },
      { id: 'b', state: 'booked', name: 'Standard', roomMinor: 2000, taxMinor: 0 },
    ],
  },
};
const preview = {
  hash: 'hash',
  refundMinor: 525,
  visits: [
    {
      id: 'stay',
      date: '2026-10-01',
      rooms: 1,
      roomIds: ['a'],
      roomDetails: [{ id: 'a', pct: 50 }],
      rent: 500,
      tax: 0,
      fee: 25,
      refundMinor: 525,
      partial: true,
    },
  ],
};

function mount(
  commit = async () => ({ receipt: { ...preview, id: 'cancellation' } }),
  responsePreview = preview,
) {
  const states = [],
    refs = [],
    requests = [],
    previews = [];
  let si = 0,
    ri = 0;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useState(initial) {
        const i = si++;
        if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
        return [
          states[i],
          (value) => {
            states[i] = typeof value === 'function' ? value(states[i]) : value;
          },
        ];
      },
      useRef(initial) {
        return (refs[ri++] ??= { current: initial });
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/ui/rentra-loader': { default: 'loader', __esModule: true },
    '@/components/navigation/NavigationLink': { default: 'a', __esModule: true },
    '@/lib/actions/customer': {
      async previewCustomerCancellation(input) {
        previews.push(input);
        return { preview: responsePreview };
      },
      async cancelCustomerVisits(input) {
        requests.push(input);
        return commit(input);
      },
    },
    '@/lib/domain/booking-record': { bookingTime: (value) => value },
    '@/lib/domain/booking-dates': { formatLocalDate: (value) => value },
    '@/lib/domain/pricing': { SLOTS: {} },
    '@/components/ui/page-header': { BackLink: 'a' },
    'lucide-react': { BedDouble: 'svg', Info: 'svg' },
    './BookingDisplay': { displayMoney: (value) => `INR ${value}`, StateBadge: 'badge' },
  };
  const fixture = { exports: {} };
  new vm.Script(code).runInNewContext({
    module: fixture,
    exports: fixture.exports,
    crypto: { randomUUID },
    require: (name) => {
      assert.ok(name in modules, name);
      return modules[name];
    },
  });
  return {
    requests,
    previews,
    render() {
      si = ri = 0;
      return fixture.exports.default({ record });
    },
  };
}
function nodes(node) {
  return !node || typeof node !== 'object'
    ? []
    : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}
const text = (node) =>
  typeof node === 'object' && node
    ? [node.props?.children].flat(Infinity).map(text).join(' ')
    : String(node ?? '');
const button = (ui, label) =>
  nodes(ui.render()).find((n) => n.type === 'button' && n.props.children === label);
const checks = (ui) =>
  nodes(ui.render()).filter((n) => n.type === 'input' && n.props.type === 'checkbox');
async function selectAndPreview(ui) {
  checks(ui)[0].props.onChange({ target: { checked: true } });
  checks(ui)[2].props.onChange({ target: { checked: false } });
  await button(ui, 'Preview cancellation').props.onClick();
}

test('hotel preview renders server room policies, components and retained facts; scope edits reset consent', async () => {
  const ui = mount();
  await selectAndPreview(ui);
  assert.equal(
    JSON.stringify(ui.previews[0]),
    JSON.stringify({ orderId: 'order', visitIds: ['stay'], roomIds: ['a'] }),
  );
  const rendered = text(ui.render()).replace(/\s+/g, ' ');
  assert.match(rendered, /Room 1: Deluxe : 50% of room, tax and allocated fee/);
  assert.match(rendered, /Retained rooms: Room 2: Standard/);
  assert.match(rendered, /room INR 500 , tax INR 0 , allocated fee INR 25/);
  assert.doesNotMatch(rendered, /NaN|undefined|rent entitlement/);
  assert.equal(button(ui, 'Confirm cancellation').props.disabled, true);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  assert.equal(button(ui, 'Confirm cancellation').props.disabled, false);
  checks(ui)[2].props.onChange({ target: { checked: true } });
  assert.equal(button(ui, 'Confirm cancellation'), undefined);
});

test('lost response retries identical command and reports a pending obligation', async () => {
  let attempts = 0;
  const ui = mount(async () => {
    if (!attempts++) throw new Error('lost');
    return { receipt: { ...preview, id: 'recorded-receipt' } };
  });
  await selectAndPreview(ui);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm cancellation').props.onClick();
  assert.match(text(ui.render()), /response was lost/);
  assert.ok(nodes(ui.render()).find((n) => n.props?.role === 'alert'));
  await button(ui, 'Confirm cancellation').props.onClick();
  assert.equal(ui.requests[0], ui.requests[1]);
  assert.match(text(ui.render()), /recorded-receipt/);
  assert.match(text(ui.render()), /obligation, not proof of a completed refund/);
  assert.match(text(ui.render()), /1 room\(s\) cancelled/);
});

test('server refusal clears consent and zero due does not invent a refund', async () => {
  const ui = mount(async () => ({ error: 'Preview again' }));
  await selectAndPreview(ui);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm cancellation').props.onClick();
  assert.match(text(ui.render()), /Preview again/);
  assert.equal(button(ui, 'Confirm cancellation'), undefined);
  const zero = mount(async () => ({ receipt: { ...preview, id: 'zero', refundMinor: 0 } }));
  await selectAndPreview(zero);
  checks(zero)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(zero, 'Confirm cancellation').props.onClick();
  assert.match(text(zero.render()), /No refund is due. No refund was requested/);
});

test('last-room receipt uses server room count and partial:false even for a submitted subset', async () => {
  const ui = mount(async () => ({
    receipt: { ...preview, id: 'last-room', visits: [{ ...preview.visits[0], partial: false }] },
  }));
  await selectAndPreview(ui);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm cancellation').props.onClick();
  assert.equal(JSON.stringify(ui.requests[0].roomIds), JSON.stringify(['a']));
  const rendered = text(ui.render());
  assert.match(rendered, /1 room\(s\) cancelled/);
  assert.doesNotMatch(
    rendered,
    /Your other rooms|Unselected visits|Retained rooms|visit\(s\) cancelled/,
  );
});

test('legacy hotel preview states the applicable booked rule with room/tax charge and refund', async () => {
  for (const [rule, expected] of [
    ['free', /Free cancellation before the booked cutoff \(48 hours before check-in\)/],
    ['first_night', /Booked late rule: first night charged/],
    ['full_stay', /Booked late rule: whole stay charged/],
  ]) {
    const legacy = {
      ...preview,
      visits: [
        {
          ...preview.visits[0],
          roomDetails: [{ id: 'a', rule, freeCancelHours: 48, refundMinor: 500, chargeMinor: 500 }],
        },
      ],
    };
    const ui = mount(undefined, legacy);
    await selectAndPreview(ui);
    const rendered = text(ui.render()).replace(/\s+/g, ' ');
    assert.match(rendered, expected);
    assert.match(rendered, /Room 1: Deluxe/);
    assert.match(rendered, /Room and tax refund INR 500 , charge INR 500/);
    assert.doesNotMatch(rendered, /undefined|NaN|% of room/);
  }
});
