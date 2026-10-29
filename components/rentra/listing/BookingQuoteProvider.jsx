'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { selectionFromSavedUrl, savedListingHref } from '@/lib/domain/saved-places';
import { beginCustomerLogin, restoreCustomerSelection } from '@/lib/actions/auth';
import { requestBookingQuote } from '@/lib/actions/customer';
import {
  changeVisitMode,
  pickVisitDate,
  removeVisitDate,
  quoteReviewFingerprint,
} from '@/lib/domain/booking-picker';

import { BookingQuoteContext as Context } from './booking-context';
export { useBookingQuote } from './booking-context';
export default function BookingQuoteProvider({ rentableId, defaultDate, defaultSlot, children }) {
  const [selection, setSelection] = useState({
    dates: defaultDate ? [defaultDate] : [],
    slot: defaultSlot,
    guests: 1,
    pets: 0,
    mode: 'single',
    anchor: null,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [notice, setNotice] = useState('');
  const [loggingIn, startLogin] = useTransition();
  const [response, setResponse] = useState(null);
  const [retry, setRetry] = useState(0);
  const [accepted, setAccepted] = useState(null);
  const previous = useRef(null);
  const { dates, slot, guests } = selection;
  const pets = selection.pets || 0;
  // Story 3.9: pets ride with the selection only when declared, so pet-free requests are unchanged.
  const party = pets ? { guests, pets } : { guests };
  const key = JSON.stringify([rentableId, dates, slot, guests, pets, retry, identity?.isCustomer]);
  const current = response?.key === key ? response : null;
  const quote = current?.quote ?? null;
  const fingerprint = quote ? quoteReviewFingerprint(quote) : null;

  useEffect(() => {
    let active = true;
    // Story 3.9: a search's pet count carries onto the listing even before dates are chosen.
    const urlPets = Number(new URLSearchParams(window.location.search).get('pets'));
    const restore = (restored) => {
      if (restored)
        setSelection({
          ...restored,
          mode: restored.dates.length > 1 ? 'separate' : 'single',
          anchor: null,
        });
      else if (Number.isInteger(urlPets) && urlPets > 0 && urlPets <= 5)
        setSelection((s) => ({ ...s, pets: urlPets }));
    };
    restoreCustomerSelection(rentableId)
      .then((result) => {
        if (!active) return;
        restore(selectionFromSavedUrl(window.location.search, rentableId) ?? result.selection);
        setIdentity(result);
      })
      .catch(() => {
        if (!active) return;
        restore(selectionFromSavedUrl(window.location.search, rentableId));
        setIdentity({ isCustomer: false });
      });
    return () => {
      active = false;
    };
  }, [rentableId]);

  useEffect(() => {
    if (!identity) return;
    const url = new URL(window.location.href);
    for (const field of ['dates', 'slot', 'guests', 'pets']) url.searchParams.delete(field);
    if (dates.length) {
      const query = new URLSearchParams(
        savedListingHref('', { dates, slot, guests, pets }).slice(1),
      );
      for (const [field, value] of query) url.searchParams.set(field, value);
    }
    window.history.replaceState(window.history.state, '', url);
  }, [dates, slot, guests, pets, identity]);

  useEffect(() => {
    if (!dates.length || !identity) return;
    let active = true;
    const timer = setTimeout(async () => {
      const started = performance.now();
      try {
        const result = await requestBookingQuote({ rentableId, dates, slot, ...party });
        if (active) {
          const selectionKey = JSON.stringify([rentableId, dates, slot, guests, pets]);
          const next = result.quote && quoteReviewFingerprint(result.quote);
          if (
            next &&
            previous.current?.selectionKey === selectionKey &&
            previous.current.fingerprint !== next
          ) {
            setNotice(
              'Price or visit details changed. Review the updated quote before continuing.',
            );
          }
          if (next) previous.current = { selectionKey, fingerprint: next };
          const remainingMs = result.quote
            ? Math.max(
                0,
                new Date(result.quote.expiresAt) -
                  new Date(result.quote.createdAt) -
                  (performance.now() - started),
              )
            : 0;
          setResponse({ key, ...result, deadline: performance.now() + remainingMs });
        }
      } catch {
        if (active) setResponse({ key, error: 'The quote could not load. Please try again.' });
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `party` is derived from guests and pets.
  }, [rentableId, dates, slot, guests, pets, key, identity]);
  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(
      () => {
        setAccepted(null);
        setNotice('Your quote expired. Checking the latest price and availability…');
        setRetry((v) => v + 1);
      },
      Math.max(0, current.deadline - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [quote, current]);

  function update(fn) {
    setNotice('');
    setAccepted(null);
    setSelection((currentSelection) => {
      try {
        return fn(currentSelection);
      } catch {
        return currentSelection;
      }
    });
  }
  function pick(date) {
    try {
      const next = pickVisitDate(selection, date);
      setSelection(next);
      setAccepted(null);
      // The calendar announces the running count itself; the price card stays quiet.
      setNotice('');
    } catch (error) {
      setNotice(error.message);
    }
  }
  const login = () =>
    startLogin(async () => {
      setLoginError(null);
      // Let Next.js handle its redirect exception outside a catch.
      const result = await beginCustomerLogin({ rentableId, dates, slot, ...party });
      if (result?.error) setLoginError(result.error);
    });
  return (
    <Context.Provider
      value={{
        ...selection,
        calendarOpen,
        setCalendarOpen,
        rentableId,
        date: dates[0] ?? '',
        selectionReady: Boolean(identity),
        isCustomer: identity?.isCustomer,
        login,
        loginError,
        loggingIn,
        quote,
        error: current?.error,
        conflicts: current?.conflicts ?? [],
        notice,
        loading: Boolean(dates.length && !current),
        retry: () => {
          setAccepted(null);
          setRetry((v) => v + 1);
        },
        accepted: Boolean(quote && accepted === fingerprint),
        accept: () => setAccepted(fingerprint),
        unaccept: () => setAccepted(null),
        pickDate: pick,
        removeDate: (date) => update((s) => removeVisitDate(s, date)),
        setMode: (mode) => update((s) => changeVisitMode(s, mode)),
        setSlot: (slot) => update((s) => ({ ...s, slot })),
        setGuests: (guests) => update((s) => ({ ...s, guests })),
        pets,
        setPets: (pets) => update((s) => ({ ...s, pets })),
        clearDates: () => update((s) => ({ ...s, dates: [], anchor: null })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
