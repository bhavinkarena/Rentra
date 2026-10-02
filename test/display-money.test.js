import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayMoney } from '../lib/domain/display-money.js';
test('ledger amounts render exact paise, negative refunds, and large integer strings', () => {
  assert.equal(displayMoney('123400'), '₹1,234');
  assert.equal(displayMoney('123456'), '₹1,234.56');
  assert.equal(displayMoney('-1'), '-₹0.01');
  assert.equal(displayMoney('900719925474099301'), '₹9,00,71,99,25,47,40,993.01');
  assert.equal(displayMoney('invalid'), 'Not recorded');
  assert.equal(displayMoney(null), 'Not recorded');
});
