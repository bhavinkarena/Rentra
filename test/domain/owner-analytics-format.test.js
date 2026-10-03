import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyticsDate,
  analyticsMoney,
  analyticsAxisMoney,
} from '../../lib/domain/owner-analytics-format.js';

test('chart labels remain identical without locale or timezone APIs', () => {
  const originalDate = Date.prototype.toLocaleDateString;
  const originalNumber = Intl.NumberFormat;
  try {
    Date.prototype.toLocaleDateString = () => {
      throw new Error('Runtime-dependent date formatting');
    };
    Intl.NumberFormat = () => {
      throw new Error('Runtime-dependent number formatting');
    };
    assert.equal(analyticsDate('2026-09-27'), '27 Sep');
    assert.equal(analyticsDate('2026-09-27', true), 'Sep');
    assert.equal(analyticsDate('2026-01-01'), '1 Jan');
    assert.equal(analyticsDate('2026-12-31'), '31 Dec');
    assert.equal(analyticsMoney('123456789'), '₹12,34,568');
    assert.equal(analyticsMoney(0), '₹0');
    assert.equal(analyticsMoney(-12500), '-₹125');
    assert.equal(analyticsAxisMoney(125000), '1.3K');
    assert.equal(analyticsAxisMoney(12500000), '1.3L');
    assert.equal(analyticsAxisMoney(1250000000), '1.3Cr');
    assert.equal(analyticsAxisMoney(0), '0');
  } finally {
    Date.prototype.toLocaleDateString = originalDate;
    Intl.NumberFormat = originalNumber;
  }
});

test('invalid analytics inputs render a stable placeholder', () => {
  assert.equal(analyticsDate(''), '—');
  assert.equal(analyticsDate('2026-13-01'), '—');
  assert.equal(analyticsMoney('invalid'), '—');
  assert.equal(analyticsAxisMoney('invalid'), '—');
});
