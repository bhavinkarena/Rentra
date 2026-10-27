import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import swc from 'next/dist/build/swc/index.js';

const { code } = swc.transformSync(
  readFileSync(new URL('../components/admin/PayoutModePanel.jsx', import.meta.url), 'utf8'),
  {
    filename: 'PayoutModePanel.jsx',
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  },
);
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
};
function mount({
  canWrite = true,
  outcome = { ok: true, effective: { mode: 'manual', source: 'global' } },
  fails = false,
} = {}) {
  const states = [],
    calls = [];
  let index = 0,
    refreshes = 0,
    task;
  const jsx = (type, props) => ({ type, props });
  const modules = {
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
        false,
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
    '@/lib/actions/hotel-finance': {
      hotelFinanceCommand: async (kind, input) => {
        calls.push({ kind, input });
        if (fails) throw new Error('Network lost');
        return input.preview
          ? {
              preview: true,
              previewHash: 'a'.repeat(64),
              current: { mode: 'auto', source: 'global' },
              proposed: 'manual',
              mode: 'manual',
            }
          : outcome;
      },
    },
    './PropertyCommandForm': { control: 'control' },
    '@/lib/domain/admin-display': { adminDateTime: (v) => v },
  };
  const fixtureModule = { exports: {} };
  new vm.Script(code).runInNewContext({
    module: fixtureModule,
    exports: fixtureModule.exports,
    require: (name) => modules[name],
    FormData: class extends Map {
      constructor() {
        super([
          ['mode', 'manual'],
          ['reason', 'Reviewed change'],
          ['ownerEmail', ''],
        ]);
      }
    },
  });
  const render = () => {
    index = 0;
    return fixtureModule.exports.default({
      data: {
        canWrite,
        effective: { mode: 'auto' },
        settings: [],
        gate: 'Provider gate unavailable',
      },
    });
  };
  return {
    render,
    calls,
    get refreshes() {
      return refreshes;
    },
    flush: () => task,
  };
}
const form = (ui) => find(ui.render(), (n) => n.type === 'form');
const review = (ui) => find(ui.render(), (n) => n.type === 'form' && !n.props.onChange);
const event = { preventDefault() {}, currentTarget: {} };

test('real mode handlers require review, consent and hash; edits discard confirmation', async () => {
  const ui = mount();
  form(ui).props.onSubmit(event);
  await ui.flush();
  assert.equal(ui.calls[0].input.preview, true);
  assert.ok(
    find(review(ui), (n) => n.type === 'input' && n.props.type === 'checkbox' && n.props.required),
  );
  form(ui).props.onChange();
  assert.equal(review(ui), null);
  form(ui).props.onSubmit(event);
  await ui.flush();
  review(ui).props.onSubmit(event);
  await ui.flush();
  assert.equal(ui.calls[2].input.previewHash, 'a'.repeat(64));
  assert.equal(ui.calls[2].input.accepted, true);
  assert.equal(ui.calls[2].input.preview, false);
  assert.equal(ui.refreshes, 1);
  assert.equal(review(ui), null);
});
test('read-only controls are disabled; stale confirmation refreshes and removes consent', async () => {
  const readOnly = mount({ canWrite: false });
  assert.equal(find(readOnly.render(), (n) => n.type === 'fieldset').props.disabled, true);
  const ui = mount({ outcome: { code: 'STALE_PREVIEW', error: 'Reload and review again' } });
  form(ui).props.onSubmit(event);
  await ui.flush();
  review(ui).props.onSubmit(event);
  await ui.flush();
  assert.equal(ui.refreshes, 1);
  assert.equal(review(ui), null);
  assert.match(find(ui.render(), (n) => n.props.role === 'alert').props.children, /Reload/);
});
test('lost response removes confirmation and explains reload recovery', async () => {
  const ui = mount({ fails: true });
  form(ui).props.onSubmit(event);
  await ui.flush();
  assert.equal(review(ui), null);
  assert.match(
    find(ui.render(), (n) => n.props.role === 'alert').props.children,
    /Reload and review/,
  );
  assert.equal(ui.refreshes, 0);
});
