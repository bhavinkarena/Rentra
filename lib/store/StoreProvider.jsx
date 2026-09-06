'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makeStore } from './index';

export default function StoreProvider({ children }) {
  /**
   * A lazy useState initialiser, not a ref.
   *
   * It runs exactly once per component instance — once per client, and once
   * per SSR render on the server — which is precisely the per-request
   * isolation we need (see lib/store/index.js for why a module-level store
   * leaks one user's state into another's response).
   *
   * The older `useRef` version of this pattern trips the react-hooks/refs
   * rule, because reading `ref.current` during render is genuinely unsafe
   * under the React Compiler. useState is the lint-clean equivalent.
   */
  const [store] = useState(makeStore);

  useEffect(() => {
    // Returns an unsubscribe fn, so this doubles as the effect cleanup.
    // Enables refetchOnFocus / refetchOnReconnect for RTK Query.
    return setupListeners(store.dispatch);
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
