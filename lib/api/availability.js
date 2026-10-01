import { API_URL } from './config.js';

/** Public live data only. A deadline must become a retryable error, not an endless skeleton. */
async function fetchPublic(code, path, query, valid, { signal, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error('Availability request timed out')),
    timeoutMs,
  );
  try {
    const response = await fetch(
      `${API_URL}/discovery/listings/${encodeURIComponent(code)}/${path}?${new URLSearchParams(query)}`,
      {
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      // Keep the API's code (e.g. ACTIVITY_UNAVAILABLE) so the picker can explain it.
      const error = new Error('Availability could not load');
      error.code = payload?.code;
      throw error;
    }
    const data = payload?.data;
    if (payload?.success !== true || !valid(data)) throw new Error('Invalid availability response');
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

const validDays = (data) =>
  Boolean(data?.days) && typeof data.days === 'object' && !Array.isArray(data.days);

export function fetchAvailability({ code, from, days, guests, signal, timeoutMs }) {
  return fetchPublic(
    code,
    'availability',
    { from, days: String(days), guests: String(guests) },
    validDays,
    { signal, timeoutMs },
  );
}

/** Venue date strip: per day, open or closed and how many starts are free. */
export function fetchHourlyAvailability({ code, from, days, activity, duration, guests, signal }) {
  return fetchPublic(
    code,
    'availability',
    { from, days: String(days), activity, duration: String(duration), guests: String(guests) },
    validDays,
    { signal },
  );
}

/** Venue start times for one day (entertainment plan, Phase 9). */
export function fetchTimes({ code, date, activity, duration, guests, signal }) {
  return fetchPublic(
    code,
    'times',
    { date, activity, duration: String(duration), guests: String(guests) },
    (data) => Array.isArray(data?.times) && Array.isArray(data?.durations),
    { signal },
  );
}

/** Request only the visible, non-past part of a month. The API clamps past starts. */
export function availabilityMonthRange(monthStart, today) {
  const year = Number(monthStart.slice(0, 4));
  const month = Number(monthStart.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const from = monthStart < today ? today : monthStart;
  return { from, days: Math.max(1, (Date.parse(last) - Date.parse(from)) / 86400000 + 1) };
}
