import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../services/baseApi.service.js';
export function makePortalStore(scope) {
  const lifecycle = { portalScope: scope, disposed: false };
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: lifecycle } }).concat(baseApi.middleware),
  });
  store.portalLifecycle = lifecycle;
  store.portalApi = baseApi;
  return store;
}
