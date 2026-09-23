import { baseApi } from './baseApi.service.js';

export const customerService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerAccount: builder.query({
      query: () => 'customer/account',
      providesTags: ['CustomerAccount'],
    }),
    updateCustomerProfile: builder.mutation({
      query: (body) => ({ url: 'customer/account/profile', method: 'POST', body }),
      invalidatesTags: ['CustomerAccount'],
    }),
    getCustomerRecords: builder.query({
      query: (params) => ({ url: 'customer/records', params }),
      providesTags: ['CustomerRecords'],
    }),
    getCustomerRecord: builder.query({
      query: (id) => `customer/records/${encodeURIComponent(id)}`,
      providesTags: ['CustomerRecords'],
    }),
    getCustomerSupport: builder.query({
      query: (params) => ({ url: 'customer/support', params }),
      providesTags: ['CustomerSupport'],
    }),
    getCustomerSupportThread: builder.query({
      query: (id) => `customer/support/${encodeURIComponent(id)}`,
      providesTags: ['CustomerSupport'],
    }),
    replyCustomerSupport: builder.mutation({
      query: ({ id, body }) => ({
        url: `customer/support/${encodeURIComponent(id)}/reply`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CustomerSupport'],
    }),
    getCustomerNotifications: builder.query({
      query: () => 'customer/notifications',
      providesTags: ['CustomerNotifications'],
    }),
    markCustomerNotificationRead: builder.mutation({
      query: (body) => ({ url: 'customer/notifications/read', method: 'POST', body }),
      invalidatesTags: ['CustomerNotifications'],
    }),
  }),
});

export const {
  useGetCustomerAccountQuery,
  useUpdateCustomerProfileMutation,
  useGetCustomerRecordsQuery,
  useGetCustomerRecordQuery,
  useGetCustomerSupportQuery,
  useGetCustomerSupportThreadQuery,
  useReplyCustomerSupportMutation,
  useGetCustomerNotificationsQuery,
  useMarkCustomerNotificationReadMutation,
} = customerService;
