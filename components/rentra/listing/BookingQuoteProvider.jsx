'use client';

import { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { useBookingSelection } from './booking-state';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { setField } from '@/lib/store/slices/searchSlice';
import { selectionFromSavedUrl } from '@/lib/domain/saved-places';
import { beginCustomerLogin, restoreCustomerSelection } from '@/lib/auth/customer-actions';
import { requestBookingQuote } from '@/lib/booking/actions';

const Context = createContext(null);
export default function BookingQuoteProvider({ rentableId, defaultDate, defaultSlot, children }) {
  const { date, slot } = useBookingSelection({ defaultDate, defaultSlot });
  const guests = useAppSelector((state) => state.search.guests);
  const dispatch = useAppDispatch();
  const [identity, setIdentity] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, startLogin] = useTransition();
  useEffect(() => {
    let active = true;
    restoreCustomerSelection(rentableId).then((result) => {
      if (!active) return;
      result.selection = selectionFromSavedUrl(window.location.search, rentableId) ?? result.selection;
      if (result.selection) {
        for (const [field, value] of Object.entries({ date: result.selection.dates[0], slot: result.selection.slot, guests: result.selection.guests })) {
          dispatch(setField({ field, value }));
        }
      }
      setIdentity(result);
    }).catch(() => { if (active) setIdentity({ isCustomer: false }); });
    return () => { active = false; };
  }, [rentableId, dispatch]);
  const dates = identity?.selection?.dates[0] === date ? identity.selection.dates : [date];
  const datesKey = JSON.stringify(dates);
  const login = () => startLogin(async () => {
    setLoginError(null);
    try {
      const result = await beginCustomerLogin({ rentableId, dates, slot, guests });
      if (result?.error) setLoginError(result.error);
    } catch { setLoginError('Login could not open. Please try again.'); }
  });
  const [response, setResponse] = useState(null);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([rentableId, datesKey, slot, guests, retry, identity?.isCustomer]);
  const current = response?.key === key ? response : null;
  useEffect(() => {
    if (!date || !identity) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await requestBookingQuote({ rentableId, dates: JSON.parse(datesKey), slot, guests });
        if (active) setResponse({ key, ...result });
      } catch {
        if (active) setResponse({ key, error: 'The quote could not load. Please try again.' });
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [rentableId, date, datesKey, slot, guests, key, identity]);
  useEffect(() => {
    if (!current?.quote) return;
    const timer = setTimeout(() => setRetry((value) => value + 1), Math.max(0, new Date(current.quote.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [current]);
  return <Context.Provider value={{ date, dates, slot, guests, selectionReady:Boolean(identity), isCustomer: identity?.isCustomer, login, loginError, loggingIn, quote: current?.quote ?? null, error: current?.error, loading: Boolean(date && !current), retry: () => setRetry((value) => value + 1), setGuests: (value) => dispatch(setField({ field: 'guests', value })) }}>{children}</Context.Provider>;
}
export function useBookingQuote() { return useContext(Context); }
