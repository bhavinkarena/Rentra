'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makePortalStore } from '@/lib/store/portal';
import { baseApi } from '@/lib/services/baseApi.service';
import { disposePortalStore, partnerTags, tagsForRevision } from '@/lib/partner/cache';
import PartnerShell from './PartnerShell';
import { runIdentityAction } from '@/lib/auth/identity-signal';

export default function PartnerPortal({
  user,
  revision,
  logoutAction,
  counts,
  completion,
  children,
}) {
  const [store] = useState(() => makePortalStore(user.cacheScope));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const channel = useRef(null);
  const check = useRef(null);
  const previousRevision = useRef(revision);

  useEffect(() => {
    let alive = true;
    let sequence = 0;
    let controller;
    const stop = () => {
      flushSync(() => {
        setReady(false);
        setMounted(false);
      });
      disposePortalStore(store);
    };
    const verify = async (conceal = true) => {
      if (!alive || store.portalLifecycle.disposed) return;
      const attempt = ++sequence;
      controller?.abort();
      controller = new AbortController();
      if (conceal) setReady(false);
      try {
        const response = await fetch('/api/partner-identity', {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (attempt !== sequence || !alive) return;
        if (response.status === 401) {
          stop();
          window.location.replace('/partner/login?session=ended');
          return;
        }
        if (!response.ok) throw new Error('Identity check unavailable');
        const identity = await response.json();
        if (attempt !== sequence || !alive || store.portalLifecycle.disposed) return;
        if (identity.scope !== user.cacheScope) {
          stop();
          window.location.reload();
          return;
        }
        if (identity.revision !== previousRevision.current) {
          previousRevision.current = identity.revision;
          store.dispatch(baseApi.util.invalidateTags(partnerTags));
        }
        setFailed(false);
        setMounted(true);
        setReady(true);
        if (conceal) store.dispatch(baseApi.internalActions.onFocus());
        return true;
      } catch {
        if (attempt === sequence && alive) {
          setReady(false);
          setFailed(true);
        }
      }
    };
    check.current = verify;
    // Custom listener ordering: verify identity BEFORE any focus refetch.
    const cleanupListeners = setupListeners(store.dispatch, (dispatch, actions) => {
      const focus = () => {
        if (document.visibilityState === 'visible') void verify();
      };
      const visibility = () => {
        if (document.visibilityState === 'hidden') {
          setReady(false);
          dispatch(actions.onFocusLost());
        } else focus();
      };
      const online = () =>
        void verify().then((verified) => {
          if (verified && !store.portalLifecycle.disposed) dispatch(actions.onOnline());
        });
      window.addEventListener('focus', focus);
      const offline = () => dispatch(actions.onOffline());
      window.addEventListener('online', online);
      window.addEventListener('offline', offline);
      document.addEventListener('visibilitychange', visibility);
      return () => {
        window.removeEventListener('focus', focus);
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
        document.removeEventListener('visibilitychange', visibility);
      };
    });
    const access = (event) => {
      if (event.detail?.status === 401 || event.detail?.status === 'PORTAL_REDIRECT') {
        stop();
        window.location.replace(event.detail.redirect ?? '/partner/login?session=ended');
      } else void verify(false);
    };
    const changed = (phase) => {
      stop();
      if (phase === 'changed') window.location.reload();
    };
    const localIdentity = (event) => changed(event.detail);
    const storage = (event) => {
      if (event.key === 'rentra:identity') {
        try {
          changed(JSON.parse(event.newValue)?.phase);
        } catch {
          /* Ignore malformed signals. */
        }
      }
    };
    window.addEventListener('rentra:access', access);
    window.addEventListener('storage', storage);
    window.addEventListener('rentra:identity', localIdentity);
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('rentra:identity');
      channel.current.onmessage = (event) => changed(event.data);
    }
    // Reconcile even if a browser missed all signals; no socket dependency.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible')
        void verify(false).then((verified) => {
          if (verified && !store.portalLifecycle.disposed)
            store.dispatch(baseApi.util.invalidateTags(partnerTags));
        });
    }, 60000);
    void verify();
    return () => {
      alive = false;
      controller?.abort();
      cleanupListeners();
      clearInterval(timer);
      channel.current?.close();
      window.removeEventListener('rentra:access', access);
      window.removeEventListener('storage', storage);
      window.removeEventListener('rentra:identity', localIdentity);
      // Defer disposal so Strict Mode's effect replay can retain the same store.
      queueMicrotask(() => {
        if (check.current === verify) disposePortalStore(store);
      });
    };
  }, [store, user.cacheScope]);

  useEffect(() => {
    if (revision !== previousRevision.current) {
      previousRevision.current = revision;
      store.dispatch(baseApi.util.invalidateTags(tagsForRevision(revision)));
    }
  }, [revision, store]);

  async function logout() {
    flushSync(() => {
      setReady(false);
      setMounted(false);
    });
    disposePortalStore(store);
    await runIdentityAction(logoutAction);
  }
  return (
    <Provider store={store}>
      <PartnerShell user={user} logoutAction={logout} counts={counts} completion={completion}>
        {mounted && (
          <div hidden={!ready} inert={!ready}>
            {children}
          </div>
        )}
        {!ready && (
          <div role="status" className="p-6">
            {failed ? (
              <>
                Could not verify your session.{' '}
                <button className="underline" onClick={() => check.current?.()}>
                  Retry
                </button>
              </>
            ) : (
              'Checking your session…'
            )}
          </div>
        )}
      </PartnerShell>
    </Provider>
  );
}
