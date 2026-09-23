import { baseApi } from './baseApi.service.js';

export const partnerService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOwnerBookings: builder.query({
      query: (params) => ({ url: 'partner/records', params }),
      providesTags: ['PartnerRecords'],
    }),
    getPartnerRecord: builder.query({
      query: (id) => `partner/records/${encodeURIComponent(id)}`,
      providesTags: ['PartnerRecords'],
    }),
    recordPartnerVisit: builder.mutation({
      query: (body) => ({ url: 'partner/records/visit', method: 'POST', body }),
      invalidatesTags: ['PartnerRecords'],
    }),
    getPartnerListings: builder.query({
      query: (params) => ({ url: 'partner/listings', params }),
      providesTags: ['PartnerListings'],
    }),
    getPartnerListing: builder.query({
      query: (id) => `partner/listings/${encodeURIComponent(id)}`,
      providesTags: ['PartnerListings'],
    }),
    getPartnerCalendar: builder.query({
      query: (id) => `partner/listings/${encodeURIComponent(id)}/calendar`,
      providesTags: ['PartnerCalendar'],
    }),
    blockSlots: builder.mutation({
      query: ({ id, body }) => ({
        url: `partner/listings/${encodeURIComponent(id)}/calendar/block`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PartnerCalendar'],
    }),
    unblockSlots: builder.mutation({
      query: ({ id, body }) => ({
        url: `partner/listings/${encodeURIComponent(id)}/calendar/unblock`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PartnerCalendar'],
    }),
    getPartnerReviews: builder.query({
      query: (params) => ({ url: 'partner/reviews', params }),
      providesTags: ['PartnerReviews'],
    }),
  }),
});

export const {
  useGetOwnerBookingsQuery,
  useGetPartnerRecordQuery,
  useRecordPartnerVisitMutation,
  useGetPartnerListingsQuery,
  useGetPartnerListingQuery,
  useGetPartnerCalendarQuery,
  useBlockSlotsMutation,
  useUnblockSlotsMutation,
  useGetPartnerReviewsQuery,
} = partnerService;
