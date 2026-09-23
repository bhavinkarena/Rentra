import { baseApi } from './baseApi.service.js';

export const adminService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminApplications: builder.query({
      query: () => 'admin/applications',
      providesTags: ['AdminApplications'],
    }),
    getAdminApplication: builder.query({
      query: (id) => `admin/applications/${encodeURIComponent(id)}`,
      providesTags: ['AdminApplications'],
    }),
    getAdminRecords: builder.query({
      query: (params) => ({ url: 'admin/records', params }),
      providesTags: ['AdminRecords'],
    }),
    getAdminRecord: builder.query({
      query: (id) => `admin/records/${encodeURIComponent(id)}`,
      providesTags: ['AdminRecords'],
    }),
    getAdminSupport: builder.query({
      query: (params) => ({ url: 'admin/support', params }),
      providesTags: ['AdminSupport'],
    }),
    getAdminSupportThread: builder.query({
      query: (id) => `admin/support/${encodeURIComponent(id)}`,
      providesTags: ['AdminSupport'],
    }),
    replyAdminSupport: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/support/${encodeURIComponent(id)}/reply`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminSupport'],
    }),
    getAdminOperations: builder.query({
      query: () => 'admin/operations',
      providesTags: ['AdminOperations'],
    }),
  }),
});

export const {
  useGetAdminApplicationsQuery,
  useGetAdminApplicationQuery,
  useGetAdminRecordsQuery,
  useGetAdminRecordQuery,
  useGetAdminSupportQuery,
  useGetAdminSupportThreadQuery,
  useReplyAdminSupportMutation,
  useGetAdminOperationsQuery,
} = adminService;
