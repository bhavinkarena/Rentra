/** Integer paise throughout; show paise only when present, including signed ledger amounts. */
export function displayMoney(value) {
  if (value == null || value === '' || !/^-?\d+$/.test(String(value))) return 'Not recorded';
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return 'Not recorded';
  const amount = BigInt(value),
    absolute = amount < 0n ? -amount : amount;
  const whole = (absolute / 100n).toLocaleString('en-IN');
  const paise = absolute % 100n;
  return `${amount < 0n ? '-' : ''}₹${whole}${paise ? '.' + String(paise).padStart(2, '0') : ''}`;
}
