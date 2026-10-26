import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import swc from 'next/dist/build/swc/index.js';

const source = readFileSync(
  new URL('../components/partner/listing/DraftSave.jsx', import.meta.url),
  'utf8',
);
const { code } = swc.transformSync(source, {
  filename: 'DraftSave.jsx',
  jsc: {
    parser: { syntax: 'ecmascript', jsx: true },
    transform: { react: { runtime: 'automatic' } },
  },
  module: { type: 'commonjs' },
});

// Execute the real component/effects; control only React hooks, browser boundaries and the action.
function mount({
  readBlocked = false,
  writeBlocked = false,
  removeBlocked = false,
  recovered = false,
  storageEntries = new Map(recovered ? [['rentra:draft:draft-1:story', '[]']] : []),
  result,
} = {}) {
  const states = [],
    refs = [],
    effects = [],
    timers = new Map();
  let stateIndex = 0,
    refIndex = 0,
    mounted = false,
    timerId = 0,
    saves = 0,
    savedEvents = 0,
    reloads = 0;
  const form = new EventTarget();
  form.elements = [];
  form.addEventListener('rentra:form-saved', () => savedEvents++);
  const document = Object.assign(new EventTarget(), { getElementById: () => form });
  const window = Object.assign(new EventTarget(), { location: { reload: () => reloads++ } });
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => (states[index] = value)];
      },
      useRef(initial) {
        const index = refIndex++;
        return (refs[index] ??= { current: initial });
      },
      useEffect(effect) {
        if (!mounted) effects.push(effect);
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/navigation/NavigationLink': { default: () => null, __esModule: true },
    '@/lib/actions/partner': {
      async saveDraftStep() {
        saves++;
        return result ?? { ok: true, contentVersion: 2 };
      },
    },
  };
  const fixtureModule = { exports: {} };
  const context = vm.createContext({
    module: fixtureModule,
    exports: fixtureModule.exports,
    require(name) {
      assert.ok(name in modules, `Unexpected dependency: ${name}`);
      return modules[name];
    },
    document,
    window,
    navigator: { onLine: true },
    Event,
    CustomEvent,
    FormData: class extends Map {
      constructor() {
        super([['title', 'Private draft']]);
      }
    },
    sessionStorage: {
      getItem(key) {
        if (readBlocked) throw new Error('Storage denied');
        return storageEntries.get(key) ?? null;
      },
      setItem(key, value) {
        if (writeBlocked) throw new Error('Storage write denied');
        storageEntries.set(key, value);
      },
      removeItem(key) {
        if (removeBlocked) throw new Error('Storage cleanup denied');
        storageEntries.delete(key);
      },
    },
    setTimeout(callback) {
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  });
  new vm.Script(code).runInContext(context);
  const props = { listing: { id: 'draft-1', status: 'draft', hasBookings: false }, step: 'story' };
  function render() {
    stateIndex = refIndex = 0;
    return fixtureModule.exports.default(props);
  }
  render();
  mounted = true;
  const cleanups = effects.map((effect) => effect());
  return {
    render,
    form,
    get saves() {
      return saves;
    },
    get savedEvents() {
      return savedEvents;
    },
    get reloads() {
      return reloads;
    },
    async flush() {
      while (timers.size) {
        const [id, callback] = timers.entries().next().value;
        timers.delete(id);
        await callback();
      }
    },
    unmount() {
      cleanups.forEach((cleanup) => cleanup?.());
    },
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

test('denied recovery storage does not prevent an acknowledged autosave', async () => {
  const ui = mount({ readBlocked: true, writeBlocked: true, removeBlocked: true });
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  assert.equal(ui.saves, 1);
  assert.equal(ui.savedEvents, 1);
  assert.ok(find(ui.render(), (node) => String(node.props?.children).startsWith('Saved ')));
  ui.unmount();
});

test('failed storage cleanup does not turn server success into save failure', async () => {
  const ui = mount({ removeBlocked: true });
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  assert.equal(ui.savedEvents, 1);
  assert.ok(find(ui.render(), (node) => String(node.props?.children).startsWith('Saved ')));
  assert.equal(
    find(ui.render(), (node) => node.props?.children === 'Retry save'),
    null,
  );
  ui.unmount();
});

test('HTTP401 CLIENT_REQUIRED exposes the supported sign-in recovery link', async () => {
  const ui = mount({ result: { status: 401, code: 'CLIENT_REQUIRED', error: 'Sign in again' } });
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  const link = find(ui.render(), (node) => node.props?.href?.startsWith('/partner/login?next='));
  assert.ok(link);
  assert.equal(
    new URL(link.props.href, 'https://rentra.test').searchParams.get('next'),
    '/partner/listings/draft-1/setup/story',
  );
  assert.equal(ui.savedEvents, 0);
  ui.unmount();
});

test('legacy session expiry still offers sign-in recovery', async () => {
  const ui = mount({ result: { code: 'SESSION_EXPIRED', error: 'Session expired' } });
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  assert.ok(find(ui.render(), (node) => node.props?.href?.startsWith('/partner/login?next=')));
  ui.unmount();
});

test('a stale draft remains blocked until the owner loads the latest version', async () => {
  const ui = mount({ result: { code: 'LISTING_CHANGED', error: 'Load latest' } });
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  assert.equal(ui.saves, 1);
  assert.ok(find(ui.render(), (node) => node.props?.children === 'Load latest'));
  assert.equal(ui.savedEvents, 0);
  ui.unmount();
});

test('Load latest drops stale typing so reload shows the newer server version', async () => {
  const storageEntries = new Map();
  const ui = mount({ storageEntries, result: { code: 'LISTING_CHANGED', error: 'Load latest' } });
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  assert.ok(storageEntries.has('rentra:draft:draft-1:story'));
  find(
    ui.render(),
    (node) => node.type === 'button' && node.props.children === 'Load latest',
  ).props.onClick();
  assert.equal(storageEntries.has('rentra:draft:draft-1:story'), false);
  assert.equal(ui.reloads, 1);
  ui.unmount();
  const remounted = mount({ storageEntries });
  await remounted.flush();
  assert.equal(
    find(remounted.render(), (node) => node.props?.children === 'Discard recovered typing'),
    null,
  );
  remounted.unmount();
});

test('Load latest is refused, not looped, when stale typing cannot be removed', async () => {
  const storageEntries = new Map();
  const ui = mount({
    storageEntries,
    removeBlocked: true,
    result: { code: 'LISTING_CHANGED', error: 'Load latest' },
  });
  ui.form.dispatchEvent(new Event('input'));
  await ui.flush();
  find(
    ui.render(),
    (node) => node.type === 'button' && node.props.children === 'Load latest',
  ).props.onClick();
  assert.equal(ui.reloads, 0);
  assert.ok(storageEntries.has('rentra:draft:draft-1:story'));
  assert.ok(
    find(ui.render(), (node) => String(node.props?.children).startsWith('Could not load latest.')),
  );
  ui.unmount();
});

test('denied discard is explained without reloading and restoring the same typing', async () => {
  const ui = mount({ recovered: true, removeBlocked: true });
  await ui.flush();
  const discard = find(ui.render(), (node) => node.props?.children === 'Discard recovered typing');
  assert.ok(discard);
  assert.doesNotThrow(() => discard.props.onClick());
  assert.equal(ui.reloads, 0);
  assert.ok(
    find(ui.render(), (node) =>
      String(node.props?.children).startsWith('Could not discard recovered typing.'),
    ),
  );
  ui.unmount();
});

test('successful discard removes typing from persistent storage before remount', async () => {
  const storageEntries = new Map([['rentra:draft:draft-1:story', '[]']]);
  const ui = mount({ storageEntries });
  await ui.flush();
  find(ui.render(), (node) => node.props?.children === 'Discard recovered typing').props.onClick();
  assert.equal(ui.reloads, 1);
  ui.unmount();
  const remounted = mount({ storageEntries });
  await remounted.flush();
  assert.equal(
    find(remounted.render(), (node) => node.props?.children === 'Discard recovered typing'),
    null,
  );
  remounted.unmount();
});

test('acknowledged explicit save advances saved state even if storage cleanup fails', async () => {
  const ui = mount({ removeBlocked: true });
  ui.form.dispatchEvent(new Event('input'));
  ui.form.dispatchEvent(new Event('rentra:form-saved'));
  ui.form.dispatchEvent(new Event('focusout'));
  await ui.flush();
  assert.equal(ui.savedEvents, 1);
  assert.equal(ui.saves, 0);
  ui.unmount();
});
