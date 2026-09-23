import { API_URL } from './config.js';

/** Public live data only. A deadline must become a retryable error, not an endless skeleton. */
export async function fetchAvailability({ code, from, days, guests, signal, timeoutMs = 20000 }) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error('Availability request timed out')),
    timeoutMs,
  );
  try {
    const query = new URLSearchParams({ from, days: String(days), guests: String(guests) });
    const response = await fetch(
      `${API_URL}/discovery/listings/${encodeURIComponent(code)}/availability?${query}`,
      {
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
      },
    );
    if (!response.ok) throw new Error('Availability could not load');
    const payload = await response.json();
    const data = payload?.data;
    if (
      payload?.success !== true ||
      !data?.days ||
      typeof data.days !== 'object' ||
      Array.isArray(data.days)
    ) {
      throw new Error('Invalid availability response');
    }
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/** Request only the visible, non-past part of a month. The API clamps past starts. */
export function availabilityMonthRange(monthStart, today) {
  const year = Number(monthStart.slice(0, 4));
  const month = Number(monthStart.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const from = monthStart < today ? today : monthStart;
  return { from, days: Math.max(1, (Date.parse(last) - Date.parse(from)) / 86400000 + 1) };
}
