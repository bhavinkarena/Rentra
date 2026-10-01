'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { beginCustomerLogin, restoreCustomerSelection } from '@/lib/actions/auth';
import { requestBookingQuote } from '@/lib/actions/customer';
import { fetchHourlyAvailability, fetchTimes } from '@/lib/api/availability';
import { quoteReviewFingerprint } from '@/lib/domain/booking-picker';
import { propertyToday } from '@/lib/domain/booking-dates';
import { hourlySelectionSchema } from '@/lib/validation/zod/booking';
import { BookingQuoteContext as Context } from './booking-context';

const STRIP_DAYS = 14;
const STALE_MS = 60_000;
/** Quote errors that mean the grid is out of date: refetch it. */
const GRID_STALE = new Set(['AVAILABILITY_CONFLICT', 'START_INVALID', 'OUTSIDE_OPENING_HOURS']);

/** An hourly selection from a card link or a saved URL; anything invalid is ignored. */
function selectionFromUrl(search, rentableId) {
  const q = new URLSearchParams(search);
  if (!q.has('date') && !q.has('activity')) return null;
  const parsed = hourlySelectionSchema.partial().safeParse({
    activity: q.get('activity') ?? undefined,
    date: q.get('date') ?? undefined,
    start: q.get('start') ?? undefined,
    durationMinutes: q.has('duration') ? Number(q.get('duration')) : undefined,
    guests:
      q.has('players') || q.has('guests') ? Number(q.get('players') ?? q.get('guests')) : undefined,
    resourceId: q.get('court') || undefined,
  });
  return parsed.success ? { ...parsed.data, rentableId } : null;
}

/**
 * The venue counterpart of BookingQuoteProvider (entertainment plan, Phase 9):
 * activity, date, duration, start, court and players → /times and a quote. It
 * fills the same context, so QuoteSummary and the login hand-off are shared.
 */
export default function HourlyQuoteProvider({
  rentableId,
  code,
  activities,
  defaultActivity,
  defaultDuration,
  children,
}) {
  const today = propertyToday();
  const [selection, setSelection] = useState({
    activity: defaultActivity,
    date: today,
    durationMinutes: defaultDuration,
    start: null,
    resourceId: null,
    guests: 1,
  });
  const [identity, setIdentity] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [timesState, setTimesState] = useState(null);
  const [daysState, setDaysState] = useState(null);
  const [response, setResponse] = useState(null);
  const [notice, setNotice] = useState('');
  const [accepted, setAccepted] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, startLogin] = useTransition();
  const previous = useRef(null);
  const { activity, date, durationMinutes, start, resourceId, guests } = selection;
  const known = (slug) => activities.some((a) => a.slug === slug);

  // Card chips, saved links and the login hand-off pre-fill the picker.
  useEffect(() => {
    let active = true;
    const apply = (restored) => {
      if (!restored) return;
      setSelection((s) => ({
        ...s,
        ...Object.fromEntries(Object.entries(restored).filter(([, v]) => v != null)),
        activity: known(restored.activity) ? restored.activity : s.activity,
        date: restored.date && restored.date >= today ? restored.date : s.date,
        rentableId: undefined,
      }));
    };
    restoreCustomerSelection(rentableId)
      .then((result) => {
        if (!active) return;
        apply(
          selectionFromUrl(window.location.search, rentableId) ??
            (result.selection?.kind === 'hourly' ? result.selection : null),
        );
        setIdentity(result);
      })
      .catch(() => {
        if (!active) return;
        apply(selectionFromUrl(window.location.search, rentableId));
        setIdentity({ isCustomer: false });
      });
    return () => {
      active = false;
    };
    // Runs once per listing; `known` and `today` are stable for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentableId]);

  // The URL carries the selection, so a shared link opens the same time.
  useEffect(() => {
    if (!identity) return;
    const url = new URL(window.location.href);
    for (const field of ['activity', 'date', 'start', 'duration', 'players', 'guests', 'court'])
      url.searchParams.delete(field);
    const query = {
      activity,
      date,
      duration: String(durationMinutes),
      players: String(guests),
      ...(start ? { start } : {}),
      ...(resourceId ? { court: resourceId } : {}),
    };
    for (const [field, value] of Object.entries(query)) url.searchParams.set(field, value);
    window.history.replaceState(window.history.state, '', url);
  }, [activity, date, durationMinutes, start, resourceId, guests, identity]);

  // Start times for the chosen day. no-store; refetched on focus once stale.
  const timesKey = JSON.stringify([activity, date, durationMinutes, guests, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    fetchTimes({
      code,
      date,
      activity,
      duration: durationMinutes,
      guests,
      signal: controller.signal,
    })
      .then((data) => setTimesState({ key: timesKey, data, at: Date.now() }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setTimesState({ key: timesKey, error: error.code ?? 'TIMES_FAILED', at: Date.now() });
      });
    return () => controller.abort();
  }, [code, activity, date, durationMinutes, guests, timesKey]);
  const times = timesState?.key === timesKey ? timesState : null;

  useEffect(() => {
    const onFocus = () => {
      if (times && Date.now() - times.at > STALE_MS) setRefresh((n) => n + 1);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [times]);

  // Date strip: closed and full days for the next two weeks.
  const daysKey = JSON.stringify([activity, durationMinutes, guests, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    fetchHourlyAvailability({
      code,
      from: today,
      days: STRIP_DAYS,
      activity,
      duration: durationMinutes,
      guests,
      signal: controller.signal,
    })
      .then((data) => setDaysState({ key: daysKey, data }))
      .catch(() => {
        if (!controller.signal.aborted) setDaysState({ key: daysKey, data: null });
      });
    return () => controller.abort();
  }, [code, today, activity, durationMinutes, guests, daysKey]);
  const days = daysState?.key === daysKey ? daysState.data : null;

  // A start or court that is no longer free is dropped (derived, not stored), with a word why.
  const offered = times?.data?.times;
  const chosen = offered?.find((t) => t.start === start);
  const timeLost = Boolean(offered && start && !chosen);
  const courtLost = Boolean(chosen && resourceId && !chosen.freeResourceIds.includes(resourceId));
  const court = courtLost ? null : resourceId;

  const full = chosen
    ? {
        kind: 'hourly',
        rentableId,
        activity,
        date,
        start,
        durationMinutes,
        resourceId: court,
        guests,
      }
    : null;
  const quoteKey = JSON.stringify([full, identity?.isCustomer, refresh]);
  const current = response?.key === quoteKey ? response : null;
  const quote = current?.quote ?? null;
  const fingerprint = quote ? quoteReviewFingerprint(quote) : null;

  useEffect(() => {
    if (!full || !identity || !chosen) return;
    let active = true;
    const timer = setTimeout(async () => {
      const started = performance.now();
      try {
        const result = await requestBookingQuote(full);
        if (!active) return;
        const next = result.quote && quoteReviewFingerprint(result.quote);
        if (next && previous.current?.key === quoteKey && previous.current.fingerprint !== next)
          setNotice(
            'Price or booking details changed. Review the updated quote before continuing.',
          );
        if (next) previous.current = { key: quoteKey, fingerprint: next };
        if (GRID_STALE.has(result.code)) setRefresh((n) => n + 1);
        const remainingMs = result.quote
          ? Math.max(
              0,
              new Date(result.quote.expiresAt) -
                new Date(result.quote.createdAt) -
                (performance.now() - started),
            )
          : 0;
        setResponse({ key: quoteKey, ...result, deadline: performance.now() + remainingMs });
      } catch {
        if (active)
          setResponse({ key: quoteKey, error: 'The quote could not load. Please try again.' });
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // `full` is captured through quoteKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, identity, Boolean(chosen)]);

  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(
      () => {
        setAccepted(null);
        setNotice('Your quote expired. Checking the latest price and availability…');
        setResponse(null);
        setRefresh((n) => n + 1);
      },
      Math.max(0, current.deadline - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [quote, current]);

  /** Any change clears the reviewed tick; changes upstream of the time clear the time. */
  function change(patch) {
    setNotice('');
    setAccepted(null);
    setSelection((s) => {
      const next = { ...s, ...patch };
      const resetsTime = ['activity', 'date', 'durationMinutes', 'guests'].some(
        (field) => field in patch && patch[field] !== s[field],
      );
      return resetsTime && !('start' in patch) ? { ...next, start: null, resourceId: null } : next;
    });
  }

  const login = () =>
    startLogin(async () => {
      setLoginError(null);
      if (!full) return;
      const result = await beginCustomerLogin(full);
      if (result?.error) setLoginError(result.error);
    });

  return (
    <Context.Provider
      value={{
        kind: 'hourly',
        ...selection,
        start: chosen ? start : null,
        resourceId: court,
        rentableId,
        today,
        stripDays: STRIP_DAYS,
        days,
        times: times?.data ?? null,
        timesError: times?.error ?? null,
        timesLoading: !times,
        chosenTime: chosen ?? null,
        setActivity: (value) => change({ activity: value }),
        setDate: (value) => change({ date: value }),
        setDuration: (value) => change({ durationMinutes: value }),
        setStart: (value) => change({ start: value, resourceId: null }),
        setResource: (value) => change({ resourceId: value || null }),
        setGuests: (value) => change({ guests: value }),
        selectionReady: Boolean(identity),
        isCustomer: identity?.isCustomer,
        login,
        loginError,
        loggingIn,
        quote,
        error: current?.error,
        conflicts: [],
        notice: timeLost
          ? 'That time was just taken. Choose another time.'
          : courtLost
            ? 'That court was just taken. Any available court is selected.'
            : notice,
        loading: Boolean(full && chosen && !current),
        retry: () => {
          setAccepted(null);
          setResponse(null);
          setRefresh((n) => n + 1);
        },
        accepted: Boolean(quote && accepted === fingerprint),
        accept: () => setAccepted(fingerprint),
        unaccept: () => setAccepted(null),
      }}
    >
      {children}
    </Context.Provider>
  );
}
