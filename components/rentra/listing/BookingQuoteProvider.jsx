'use client';

import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react';
import { selectionFromSavedUrl, savedListingHref } from '@/lib/domain/saved-places';
import { beginCustomerLogin, restoreCustomerSelection } from '@/lib/actions/auth';
import { requestBookingQuote } from '@/lib/actions/customer';
import { changeVisitMode, pickVisitDate, removeVisitDate, quoteReviewFingerprint } from '@/lib/domain/booking-picker';

const Context = createContext(null);
export default function BookingQuoteProvider({ rentableId, defaultDate, defaultSlot, children }) {
  const [selection, setSelection] = useState({ dates: defaultDate ? [defaultDate] : [], slot: defaultSlot, guests: 1, mode: 'single', anchor: null });
  const [identity, setIdentity] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [notice, setNotice] = useState('');
  const [loggingIn, startLogin] = useTransition();
  const [response, setResponse] = useState(null);
  const [retry, setRetry] = useState(0);
  const [accepted, setAccepted] = useState(null);
  const previous = useRef(null);
  const { dates, slot, guests } = selection;
  const key = JSON.stringify([rentableId, dates, slot, guests, retry, identity?.isCustomer]);
  const current = response?.key === key ? response : null;
  const quote = current?.quote ?? null;
  const fingerprint = quote ? quoteReviewFingerprint(quote) : null;

  useEffect(() => {
    let active = true;
    restoreCustomerSelection(rentableId).then(result => {
      if (!active) return;
      const restored = selectionFromSavedUrl(window.location.search, rentableId) ?? result.selection;
      if (restored) setSelection({ ...restored, mode: restored.dates.length > 1 ? 'separate' : 'single', anchor: null });
      setIdentity(result);
    }).catch(() => {
      if (!active) return;
      const restored = selectionFromSavedUrl(window.location.search, rentableId);
      if (restored) setSelection({ ...restored, mode: restored.dates.length > 1 ? 'separate' : 'single', anchor: null });
      setIdentity({ isCustomer: false });
    });
    return () => { active = false; };
  }, [rentableId]);

  useEffect(() => {
    if (!identity) return;
    const url = new URL(window.location.href);
    for (const field of ['dates', 'slot', 'guests']) url.searchParams.delete(field);
    if (dates.length) {
      const query = new URLSearchParams(savedListingHref('', { dates, slot, guests }).slice(1));
      for (const [field, value] of query) url.searchParams.set(field, value);
    }
    window.history.replaceState(window.history.state, '', url);
  }, [dates, slot, guests, identity]);

  useEffect(() => {
    if (!dates.length || !identity) return;
    let active = true;
    const timer = setTimeout(async () => {
      const started = performance.now();
      try {
        const result = await requestBookingQuote({ rentableId, dates, slot, guests });
        if (active) {
          const selectionKey = JSON.stringify([rentableId, dates, slot, guests]);
          const next = result.quote && quoteReviewFingerprint(result.quote);
          if (next && previous.current?.selectionKey === selectionKey && previous.current.fingerprint !== next) {
            setNotice('Price or visit details changed. Review the updated quote before continuing.');
          }
          if (next) previous.current = { selectionKey, fingerprint: next };
          const remainingMs = result.quote
            ? Math.max(0, new Date(result.quote.expiresAt) - new Date(result.quote.createdAt) - (performance.now() - started)) : 0;
          setResponse({ key, ...result, deadline: performance.now() + remainingMs });
        }
      } catch { if (active) setResponse({ key, error: 'The quote could not load. Please try again.' }); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [rentableId, dates, slot, guests, key, identity]);
  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(() => { setAccepted(null); setNotice('Your quote expired. Checking the latest price and availability…'); setRetry(v => v + 1); }, Math.max(0, current.deadline - performance.now()));
    return () => clearTimeout(timer);
  }, [quote, current]);

  function update(fn) {
    setNotice('');
    setAccepted(null);
    setSelection(currentSelection => {
      try { return fn(currentSelection); } catch { return currentSelection; }
    });
  }
  function pick(date) {
    try { const next = pickVisitDate(selection, date); setSelection(next); setAccepted(null); setNotice(`${next.dates.length} visit${next.dates.length === 1 ? '' : 's'} selected.`); }
    catch (error) { setNotice(error.message); }
  }
  const login = () => startLogin(async () => {
    setLoginError(null);
    // Let Next.js handle its redirect exception outside a catch.
    const result = await beginCustomerLogin({ rentableId, dates, slot, guests });
    if (result?.error) setLoginError(result.error);
  });
  return <Context.Provider value={{ ...selection, rentableId, date: dates[0] ?? '', selectionReady: Boolean(identity), isCustomer: identity?.isCustomer,
    login, loginError, loggingIn, quote, error: current?.error, conflicts: current?.conflicts ?? [], notice,
    loading: Boolean(dates.length && !current), retry: () => { setAccepted(null); setRetry(v => v + 1); },
    accepted: Boolean(quote && accepted === fingerprint), accept: () => setAccepted(fingerprint),
    pickDate: pick, removeDate: date => update(s => removeVisitDate(s, date)),
    setMode: mode => update(s => changeVisitMode(s, mode)), setSlot: slot => update(s => ({ ...s, slot })),
    setGuests: guests => update(s => ({ ...s, guests })), clearDates: () => update(s => ({ ...s, dates: [], anchor: null })),
  }}>{children}</Context.Provider>;
}
export function useBookingQuote() { return useContext(Context); }
