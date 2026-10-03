// Analytics dates are already calendar dates in IST. Keep rendered text independent
// of browser/Node locale data (which can disagree on abbreviations such as Sep).
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function analyticsDate(value, monthly = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return '—';
  const month = months[Number(match[2]) - 1];
  if (!month || Number(match[3]) < 1 || Number(match[3]) > 31) return '—';
  return monthly ? month : `${Number(match[3])} ${month}`;
}

export function analyticsMoney(minor) {
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) return '—';
  const digits = String(Math.round(Math.abs(amount)));
  const last = digits.slice(-3);
  const leading = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}₹${leading ? `${leading},` : ''}${last}`;
}

export function analyticsAxisMoney(minor) {
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) return '—';
  const magnitude = Math.abs(amount);
  const [divisor, suffix] =
    magnitude >= 10000000
      ? [10000000, 'Cr']
      : magnitude >= 100000
        ? [100000, 'L']
        : magnitude >= 1000
          ? [1000, 'K']
          : [1, ''];
  return `${Number((amount / divisor).toFixed(1))}${suffix}`;
}
