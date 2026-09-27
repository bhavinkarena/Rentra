import { baseApi } from './baseApi.service.js';

export const partnerService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOwnerBookings: builder.query({
      query: (params) => ({ url: 'partner/records', params }),
      keepUnusedDataFor: 120,
      providesTags: (result) => [
        { type: 'PartnerRecords', id: 'LIST' },
        ...(result?.data?.items ?? []).map(({ id }) => ({ type: 'PartnerRecords', id })),
      ],
    }),
    getPartnerRecord: builder.query({
      query: (id) => `partner/records/${encodeURIComponent(id)}`,
      keepUnusedDataFor: 60,
      providesTags: (_result, _error, id) => [{ type: 'PartnerRecords', id }],
    }),
    recordPartnerVisit: builder.mutation({
      query: (body) => ({ url: 'partner/records/visit', method: 'POST', body }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['PartnerRecords', 'PartnerCalendar', 'PartnerSummary'],
    }),
    getPartnerSummary: builder.query({
      query: () => 'partner/listings/summary',
      keepUnusedDataFor: 300,
      providesTags: [{ type: 'PartnerSummary', id: 'CURRENT' }],
    }),
    getPartnerListings: builder.query({
      query: (params) => ({ url: 'partner/listings', params }),
      keepUnusedDataFor: 300,
      providesTags: (result) => [
        { type: 'PartnerListings', id: 'LIST' },
        ...(result?.data?.items ?? []).map(({ id }) => ({ type: 'PartnerListings', id })),
      ],
    }),
    getPartnerListing: builder.query({
      query: (id) => `partner/listings/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'PartnerListings', id }],
    }),
    getPartnerCalendar: builder.query({
      query: (id) => `partner/listings/${encodeURIComponent(id)}/calendar`,
      keepUnusedDataFor: 60,
      providesTags: (_result, _error, id) => [{ type: 'PartnerCalendar', id }],
    }),
    blockSlots: builder.mutation({
      query: ({ id, body }) => ({
        url: `partner/listings/${encodeURIComponent(id)}/calendar/block`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error ? [] : [{ type: 'PartnerCalendar', id }, 'PartnerListings', 'PartnerSummary'],
    }),
    unblockSlots: builder.mutation({
      query: ({ id, body }) => ({
        url: `partner/listings/${encodeURIComponent(id)}/calendar/unblock`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error ? [] : [{ type: 'PartnerCalendar', id }, 'PartnerListings', 'PartnerSummary'],
    }),
    getPartnerReviews: builder.query({
      query: (params) => ({ url: 'partner/reviews', params }),
      providesTags: ['PartnerReviews'],
    }),
  }),
});

export const {
  useGetOwnerBookingsQuery,
  useGetPartnerSummaryQuery,
  useGetPartnerRecordQuery,
  useRecordPartnerVisitMutation,
  useGetPartnerListingsQuery,
  useGetPartnerListingQuery,
  useGetPartnerCalendarQuery,
  useBlockSlotsMutation,
  useUnblockSlotsMutation,
  useGetPartnerReviewsQuery,
} = partnerService;
