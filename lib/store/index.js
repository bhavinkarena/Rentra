import { configureStore } from '@reduxjs/toolkit';
import searchReducer from './slices/searchSlice';
import { rentraApi } from './api/rentraApi';

/**
 * A FACTORY, not a singleton.
 *
 * In the App Router the server renders many requests in one process. A module
 * -level store would be shared across them and leak one user's state into
 * another's response. Always create a store per request / per client.
 */
export const makeStore = () =>
  configureStore({
    reducer: {
      search: searchReducer,
      [rentraApi.reducerPath]: rentraApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(rentraApi.middleware),
  });
