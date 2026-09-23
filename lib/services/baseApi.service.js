import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../api/config.js';

// Keep the envelope: callers need redirect/revalidate as well as data.
// Cookies remain the authentication mechanism; never copy tokens into Redux.
export const baseApi = createApi({
  reducerPath: 'rentraApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/`,
    credentials: 'include',
    validateStatus: (response, body) =>
      response.status >= 200 && response.status < 300 && body?.success !== false,
  }),
  tagTypes: [
    'CustomerAccount',
    'CustomerRecords',
    'CustomerSupport',
    'CustomerNotifications',
    'PartnerListings',
    'PartnerRecords',
    'PartnerCalendar',
    'PartnerReviews',
    'AdminApplications',
    'AdminRecords',
    'AdminSupport',
    'AdminOperations',
  ],
  endpoints: () => ({}),
});
