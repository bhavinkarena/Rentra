'use client';

import { createContext, useContext } from 'react';

// Consumers such as card hearts need the context, not the quote provider's
// actions, validation and effects in their own client dependency graph.
export const BookingQuoteContext = createContext(null);
export function useBookingQuote() {
  return useContext(BookingQuoteContext);
}
