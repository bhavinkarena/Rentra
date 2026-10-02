const money = [
  '/partner/earnings',
  '/partner/finance',
  '/partner/statements',
  '/partner/payouts',
  '/partner/allocations',
  '/partner/settings/payout',
];
const help = ['/partner/help', '/partner/support', '/partner/disputes'];
const under = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);
export function ownerNavMatch(path, href) {
  if (href === '/partner') return path === href || under(path, '/partner/onboarding');
  if (href === '/partner/earnings') return money.some((prefix) => under(path, prefix));
  if (href === '/partner/help') return help.some((prefix) => under(path, prefix));
  if (href === '/partner/settings' && under(path, '/partner/settings/payout')) return false;
  return under(path, href);
}
export function ownerRouteLabel(path, approved = true) {
  if (money.some((prefix) => under(path, prefix))) return 'Earnings';
  if (under(path, '/partner/disputes')) return 'Disputes';
  if (help.some((prefix) => under(path, prefix))) return 'Help & support';
  for (const [prefix, label] of [
    ['calendar', 'Calendar'],
    ['bookings', 'Bookings'],
    ['listings', 'Properties'],
    ['reviews', 'Reviews'],
    ['updates', 'Inbox'],
    ['team', 'Caretakers'],
    ['settings', 'Settings'],
    ['onboarding', 'Owner verification'],
  ]) {
    if (under(path, `/partner/${prefix}`)) return label;
  }
  return approved ? 'Today' : 'Get verified';
}
