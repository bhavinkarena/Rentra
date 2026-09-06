import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * RTK Query is scoped to AUTHENTICATED, noindex surfaces only —
 * the Client dashboard and Super Admin, where there is no SEO to lose and
 * the data is live, personal and behind a login.
 *
 * Public listing and search data does NOT come through here. It is fetched
 * in Server Components, because a client-side fetch means a loading spinner,
 * shipped JavaScript, and a page Google cannot read.
 *
 * Rule of thumb: if the URL is indexable, RTK Query has no business in it.
 */
export const rentraApi = createApi({
  reducerPath: 'rentraApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Booking', 'Listing', 'Availability', 'Payout'],
  endpoints: (build) => ({
    // ---- Client (owner) dashboard ----
    getOwnerBookings: build.query({
      query: (status = 'pending') => `partner/bookings?status=${status}`,
      providesTags: ['Booking'],
    }),
    acceptBooking: build.mutation({
      query: (bookingId) => ({
        method: 'POST',
        url: `partner/bookings/${bookingId}/accept`,
      }),
      invalidatesTags: ['Booking', 'Availability'],
    }),
    declineBooking: build.mutation({
      query: ({ bookingId, reason }) => ({
        method: 'POST',
        url: `partner/bookings/${bookingId}/decline`,
        body: { reason },
      }),
      invalidatesTags: ['Booking', 'Availability'],
    }),
    blockSlots: build.mutation({
      query: ({ rentableId, dates, slot }) => ({
        method: 'POST',
        url: `partner/listings/${rentableId}/block`,
        body: { dates, slot },
      }),
      invalidatesTags: ['Availability'],
    }),
    getPayouts: build.query({
      query: () => 'partner/payouts',
      providesTags: ['Payout'],
    }),
  }),
});

export const {
  useGetOwnerBookingsQuery,
  useAcceptBookingMutation,
  useDeclineBookingMutation,
  useBlockSlotsMutation,
  useGetPayoutsQuery,
} = rentraApi;
