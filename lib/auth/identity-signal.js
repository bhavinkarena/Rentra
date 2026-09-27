// Only lifecycle signals cross tabs: no user data, session ID or credential.
function signal(phase) {
  window.dispatchEvent(new CustomEvent('rentra:identity', { detail: phase }));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('rentra:identity');
    channel.postMessage(phase);
    channel.close();
  }
  try {
    localStorage.setItem('rentra:identity', JSON.stringify({ phase, nonce: crypto.randomUUID() }));
  } catch {
    /* Focus/periodic identity checks also work when storage is disabled. */
  }
}
export async function runIdentityAction(action, ...args) {
  signal('changing');
  try {
    return await action(...args);
  } finally {
    signal('changed');
  }
}
