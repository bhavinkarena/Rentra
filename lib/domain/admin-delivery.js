/** Provider handoff is distinct from delivery; uncertain sends cannot be retried. */
export function deliveryMeta(state) {
  const states = {
    pending: ['Queued', 'info'],
    retry: ['Retry scheduled', 'warning'],
    accepted: ['Provider accepted', 'info'],
    sent: ['Sent; delivery unconfirmed', 'info'],
    delivered: ['Delivered', 'success'],
    failed: ['Failed', 'danger'],
    blocked: ['Blocked before dispatch', 'danger'],
    undelivered: ['Provider undelivered', 'danger'],
    unknown: ['Dispatch unknown', 'warning'],
    suppressed: ['Suppressed', 'neutral'],
    sending: ['Dispatch in progress', 'info'],
  };
  const [label, tone] = states[state] || [
    String(state || 'Not recorded').replaceAll('_', ' '),
    'neutral',
  ];
  return { label, tone };
}
export function deliveryOperation(message) {
  if (message.state === 'unknown') return 'reconcile';
  return ['blocked', 'failed', 'retry'].includes(message.state) && !message.provider_id
    ? 'retry'
    : null;
}
