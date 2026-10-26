import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
import swc from 'next/dist/build/swc/index.js';
import { displayMoney } from '../lib/domain/display-money.js';

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
  inputRecord = record,
  moneyFormatter = (value) => `INR ${value}`,
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
    './BookingDisplay': { displayMoney: moneyFormatter, StateBadge: 'badge' },
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
      return fixture.exports.default({ record: inputRecord });
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

const departurePreview = {
  ...preview,
  operation: 'early_departure',
  requestedAt: '2026-10-02T09:00:00Z',
  visits: [
    {
      ...preview.visits[0],
      priorReserved: { rent: 10, tax: 1, fee: 1 },
      roomDetails: [
        {
          id: 'a',
          offered: true,
          pct: 50,
          consumedNights: ['2026-10-01', '2026-10-02'],
          unusedNights: ['2026-10-03'],
          original: { rent: 1000, tax: 100, fee: 50 },
          unused: { rent: 500, tax: 50, fee: 25 },
        },
      ],
    },
  ],
};
test('payment notice uses the real currency formatter', () => {
  const ui = mount(undefined, preview, record, displayMoney);
  assert.ok(
    text(ui.render())
      .replace(/\s+/g, ' ')
      .includes(`Actual bank refund: ${displayMoney(0)}`),
  );
  assert.match(displayMoney(0), /₹/);
  assert.doesNotMatch(text(ui.render()), /refund: \?0/);
});
async function earlyPreview(ui) {
  button(ui, 'End stay early').props.onClick();
  checks(ui)[0].props.onChange({ target: { checked: true } });
  checks(ui)[2].props.onChange({ target: { checked: false } });
  await button(ui, 'Preview early departure').props.onClick();
}
test('early departure shows booked unused-night facts, explicit occupancy consent and truthful receipt', async () => {
  const ui = mount(
    async () => ({
      receipt: { ...departurePreview, id: 'departure', departedAt: departurePreview.requestedAt },
    }),
    departurePreview,
  );
  await earlyPreview(ui);
  assert.equal(ui.previews[0].operation, 'early_departure');
  assert.equal(JSON.stringify(ui.previews[0].roomIds), JSON.stringify(['a']));
  const rendered = text(ui.render()).replace(/\s+/g, ' ');
  assert.match(rendered, /Consumed nights: 2026-10-01, 2026-10-02/);
  assert.match(rendered, /Unused nights: 2026-10-03/);
  assert.match(rendered, /Booked offer: 50%/);
  assert.match(rendered, /Unused room INR 500 , tax INR 50 , allocated fee INR 25/);
  assert.match(rendered, /Prior reserved refunds: room INR 10/);
  assert.match(rendered, /explicitly end occupancy.*including when no refund is due/);
  assert.doesNotMatch(rendered, /Only the selected visits are cancelled/);
  assert.equal(button(ui, 'Confirm early departure').props.disabled, true);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm early departure').props.onClick();
  assert.match(text(ui.render()), /1 room\(s\) ended early/);
  assert.match(text(ui.render()), /Early-departure.*reference/);
  assert.doesNotMatch(text(ui.render()), /room\(s\) cancelled|Visits cancelled/);
});
test('operation changes clear consent, preview and lost-response retry; inactive cancellation selection resets', async () => {
  const ui = mount(
    async () => {
      throw Error('lost');
    },
    departurePreview,
    { ...record, visits: [{ ...record.visits[0], state: 'handed_over' }] },
  );
  assert.equal(checks(ui)[0].props.disabled, true);
  await earlyPreview(ui);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm early departure').props.onClick();
  assert.match(text(ui.render()), /which rooms ended early/);
  await button(ui, 'Confirm early departure').props.onClick();
  assert.equal(ui.requests[0], ui.requests[1]);
  button(ui, 'Cancel visits').props.onClick();
  assert.equal(button(ui, 'Confirm cancellation'), undefined);
  assert.equal(checks(ui)[0].props.checked, false);
  assert.equal(button(ui, 'Preview cancellation').props.disabled, true);
  button(ui, 'End stay early').props.onClick();
  checks(ui)[0].props.onChange({ target: { checked: true } });
  await button(ui, 'Preview early departure').props.onClick();
  assert.equal(button(ui, 'Confirm early departure').props.disabled, true);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm early departure').props.onClick();
  assert.notEqual(ui.requests[2].idempotencyKey, ui.requests[0].idempotencyKey);
});
test('no-offer zero departure and server refusal never invent a completed refund', async () => {
  const noOffer = {
    ...departurePreview,
    refundMinor: 0,
    visits: [
      {
        ...departurePreview.visits[0],
        roomDetails: [{ ...departurePreview.visits[0].roomDetails[0], offered: false, pct: 0 }],
      },
    ],
  };
  const ui = mount(
    async () => ({
      receipt: { ...noOffer, id: 'zero-departure', departedAt: noOffer.requestedAt },
    }),
    noOffer,
  );
  await earlyPreview(ui);
  assert.match(text(ui.render()), /No booked offer: 0%/);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm early departure').props.onClick();
  assert.match(text(ui.render()), /No refund is due. No refund was requested/);
  assert.match(text(ui.render()), /room\(s\) ended early/);
  const rejected = mount(
    async () => ({ error: 'Night boundary changed. Preview again.' }),
    departurePreview,
  );
  await earlyPreview(rejected);
  checks(rejected)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(rejected, 'Confirm early departure').props.onClick();
  assert.equal(button(rejected, 'Confirm early departure'), undefined);
  assert.match(text(rejected.render()), /Night boundary changed/);
});

test('last booked room alongside departed rows submits explicit scope and retries the same command', async () => {
  let attempts = 0;
  const last = { ...departurePreview, visits: [{ ...departurePreview.visits[0], partial: false }] };
  const ui = mount(
    async () => {
      if (!attempts++) throw Error('lost');
      return { receipt: { ...last, id: 'last-departure', departedAt: last.requestedAt } };
    },
    last,
    {
      ...record,
      stay: {
        ...record.stay,
        rooms: [
          record.stay.rooms[0],
          { ...record.stay.rooms[1], state: 'stayed', departedAt: '2026-10-02T08:00Z' },
        ],
      },
    },
  );
  button(ui, 'End stay early').props.onClick();
  assert.equal(checks(ui).length, 1, 'single booked room needs no room picker');
  checks(ui)[0].props.onChange({ target: { checked: true } });
  await button(ui, 'Preview early departure').props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.previews[0])), {
    orderId: 'order',
    visitIds: ['stay'],
    roomIds: ['a'],
    operation: 'early_departure',
  });
  assert.equal(button(ui, 'Confirm early departure').props.disabled, true);
  checks(ui)
    .at(-1)
    .props.onChange({ target: { checked: true } });
  await button(ui, 'Confirm early departure').props.onClick();
  await button(ui, 'Confirm early departure').props.onClick();
  assert.equal(ui.requests[0], ui.requests[1]);
  assert.match(text(ui.render()), /1 room\(s\) ended early/);
  assert.doesNotMatch(text(ui.render()), /Your other rooms stay booked/);
});
