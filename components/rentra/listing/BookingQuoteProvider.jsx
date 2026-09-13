'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useBookingSelection } from './booking-state';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { setField } from '@/lib/store/slices/searchSlice';
import { requestBookingQuote } from '@/lib/booking/actions';

const Context = createContext(null);
export default function BookingQuoteProvider({ rentableId, defaultDate, defaultSlot, children }) {
  const { date, slot } = useBookingSelection({ defaultDate, defaultSlot });
  const guests = useAppSelector((state) => state.search.guests);
  const dispatch = useAppDispatch();
  const [response, setResponse] = useState(null);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([rentableId, date, slot, guests, retry]);
  const current = response?.key === key ? response : null;
  useEffect(() => {
    if (!date) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await requestBookingQuote({ rentableId, dates: [date], slot, guests });
        if (active) setResponse({ key, ...result });
      } catch {
        if (active) setResponse({ key, error: 'The quote could not load. Please try again.' });
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [rentableId, date, slot, guests, key]);
  useEffect(() => {
    if (!current?.quote) return;
    const timer = setTimeout(() => setRetry((value) => value + 1), Math.max(0, new Date(current.quote.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [current]);
  return <Context.Provider value={{ date, slot, guests, quote: current?.quote ?? null, error: current?.error, loading: Boolean(date && !current), retry: () => setRetry((value) => value + 1), setGuests: (value) => dispatch(setField({ field: 'guests', value })) }}>{children}</Context.Provider>;
}
export function useBookingQuote() { return useContext(Context); }
