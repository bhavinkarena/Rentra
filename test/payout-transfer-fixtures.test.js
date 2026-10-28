import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';
import swc from 'next/dist/build/swc/index.js';

const { code } = swc.transformSync(
  readFileSync(new URL('../components/finance/Statements.jsx', import.meta.url), 'utf8'),
  {
    filename: 'Statements.jsx',
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  },
);
const fixtureModule = { exports: {} };
const modules = {
  'react/jsx-runtime': runtime,
  '@/lib/domain/display-money': {
    displayMoney: (value) => `INR ${(Number(value) / 100).toFixed(2)}`,
  },
  '@/lib/domain/admin-display': { adminDateTime: (value) => value },
  '@/lib/domain/owner-earnings': { earningsTime: (value) => value },
  '@/components/navigation/NavigationLink': {
    __esModule: true,
    default: ({ children, ...props }) => React.createElement('a', props, children),
  },
  '@/components/portal/DetailLayout': {
    pickTab: (value) => value ?? 'allocations',
    DetailTabs: () => null,
  },
  '@/components/admin/AdminPrimitives': {
    AdminPage: ({ children }) => React.createElement('main', null, children),
    AdminPageHeader: () => null,
  },
  'lucide-react': { ArrowUpRight: () => null },
  '@/components/ui/pagination': { __esModule: true, default: () => null },
};
new vm.Script(code).runInNewContext({
  module: fixtureModule,
  exports: fixtureModule.exports,
  URLSearchParams,
  require: (name) => modules[name] ?? {},
});
const fixture = {
  sourceId: 'source-capture-allocation',
  state: 'unknown',
  destinationVersion: 3,
  expectedMinor: '90000',
  actualBankMinor: '0',
  simulatedExposureMinor: '90000',
  fundingAuthority: 'unset',
};
const row = {
  id: 'allocation',
  title: 'Booked property',
  environment: 'test',
  component: 'rent',
  bookingState: 'completed',
  reference: 'BOOKING',
  reasons: [],
  refunds: [],
  fixture,
  collectedMinor: '100000',
  eligibleMinor: '0',
  heldMinor: '0',
  refundedMinor: '100000',
};

test('actual allocation rendering labels fixture expectation, unknown/late success, bank zero and simulated exposure', () => {
  for (const state of ['reserved', 'processing', 'unknown', 'succeeded']) {
    const html = renderToStaticMarkup(
      React.createElement(fixtureModule.exports.Allocation, {
        row: { ...row, fixture: { ...fixture, state } },
      }),
    );
    assert.match(html, new RegExp(`Local payout fixture · ${state}`));
    assert.match(html, /Expected fixture amount: INR 900.00/);
    assert.match(html, /Actual bank proceeds: INR 0.00/);
    assert.match(html, /Source allocation: source-capture-allocation/);
    assert.match(html, /Simulated overlap exposure: INR 900.00/);
    assert.match(html, /Funding authority: unset/);
    assert.match(html, /not an approved net owner payable calculation/);
    assert.match(html, /No funded refund money or recovery debt/);
    assert.doesNotMatch(html, /<button/);
  }
});
test('actual owner/admin statement allocation and empty fixture rendering', () => {
  for (const admin of [false, true]) {
    const html = renderToStaticMarkup(
      React.createElement(fixtureModule.exports.Statement, {
        admin,
        data: {
          filters: { page: 1, period: '2026-10', environment: 'test' },
          items: [row],
          count: 1,
          totals: {},
        },
      }),
    );
    assert.match(html, /Local payout fixture · unknown/);
  }
  assert.equal(
    renderToStaticMarkup(
      React.createElement(fixtureModule.exports.FixtureSummary, { value: null }),
    ),
    '',
  );
});
