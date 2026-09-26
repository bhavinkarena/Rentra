'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  startTransition,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  loadSavedPlaces,
  loadGuestSavedPlaces,
  mergeGuestSavedPlaces,
  updateSavedPlace,
} from '@/lib/actions/customer';
import {
  GUEST_SAVED_KEY,
  GUEST_MERGE_OWNER_KEY,
  SAVED_SIGNAL_KEY,
  SAVED_LIMIT,
  parseGuestSaved,
  validSavedSelection,
} from '@/lib/domain/saved-places';

const Context = createContext(null);
function readGuest() {
  return parseGuestSaved(localStorage.getItem(GUEST_SAVED_KEY));
}
function writeGuest(entries) {
  localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(entries));
}
export function signalSavedChange() {
  try {
    if (localStorage.getItem(GUEST_MERGE_OWNER_KEY)) {
      localStorage.removeItem(GUEST_SAVED_KEY);
      localStorage.removeItem(GUEST_MERGE_OWNER_KEY);
    }
    localStorage.setItem(SAVED_SIGNAL_KEY, crypto.randomUUID());
  } catch {
    /* No account records are stored locally. */
  }
  window.dispatchEvent(new Event('rentra-saved-changed'));
}
export default function SavedPlacesProvider({ children }) {
  const pathname = usePathname();
  const [state, setState] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState(null);
  const generation = useRef(0);
  const lastScope = useRef(undefined);
  const inFlight = useRef(false);
  const current = state?.path === pathname ? state : null;
  const refresh = useCallback(() => {
    const epoch = ++generation.current;
    setState(null);
    setUndo(null);
    setError(null);
    startTransition(async () => {
      try {
        const actor = await loadSavedPlaces();
        if (epoch !== generation.current) return;
        if (actor.error) throw new Error(actor.error);
        setIdentity({ mode: actor.mode, profile: actor.profile });
        if (lastScope.current !== actor.scope) {
          lastScope.current = actor.scope;
          try {
            localStorage.setItem(SAVED_SIGNAL_KEY, crypto.randomUUID());
          } catch {}
        }
        let entries = actor.entries,
          mergeError = null;
        if (actor.mode !== 'other') {
          let guest = [],
            claimedFor = null;
          try {
            guest = readGuest();
            claimedFor = localStorage.getItem(GUEST_MERGE_OWNER_KEY);
          } catch {
            if (actor.mode === 'guest')
              throw new Error('Browser storage is unavailable. Enable it to keep guest saves.');
            mergeError = 'Your account saves loaded, but guest browser storage is unavailable.';
          }
          if (
            actor.mode === 'customer' &&
            guest.length &&
            (!claimedFor || claimedFor === actor.owner)
          ) {
            localStorage.setItem(GUEST_MERGE_OWNER_KEY, actor.owner);
            const merged = await mergeGuestSavedPlaces(actor.scope, guest);
            if (epoch !== generation.current) return;
            if (merged.accountChanged) throw new Error(merged.error);
            if (merged.error) mergeError = merged.error;
            else {
              entries = merged.entries;
              const acknowledged = new Set(guest.map((e) => e.entryId));
              const remaining = readGuest().filter((e) => !acknowledged.has(e.entryId));
              writeGuest(remaining);
              if (!remaining.length) localStorage.removeItem(GUEST_MERGE_OWNER_KEY);
            }
          } else if (actor.mode === 'guest') {
            const result = await loadGuestSavedPlaces(claimedFor ? [] : guest);
            if (result.error) throw new Error(result.error);
            entries = result.entries;
          }
        }
        if (epoch === generation.current) {
          setState({ ...actor, entries, path: pathname });
          setError(mergeError);
        }
      } catch (failure) {
        if (epoch === generation.current)
          setError(failure.message || 'Saved places could not load. Please retry.');
      }
    });
  }, [pathname]);
  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const token = generation;
    const changed = (event) => {
      if (
        !event.key ||
        [GUEST_SAVED_KEY, GUEST_MERGE_OWNER_KEY, SAVED_SIGNAL_KEY].includes(event.key)
      )
        refresh();
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') {
        ++generation.current;
        setState(null);
        setUndo(null);
      } else refresh();
    };
    window.addEventListener('storage', changed);
    window.addEventListener('focus', refresh);
    window.addEventListener('rentra-saved-changed', refresh);
    window.addEventListener('rentra-profile-changed', refresh);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      clearTimeout(timer);
      ++token.current;
      window.removeEventListener('storage', changed);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('rentra-saved-changed', refresh);
      window.removeEventListener('rentra-profile-changed', refresh);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [refresh]);
  useEffect(() => {
    if (!undo || busy) return;
    const timer = setTimeout(() => setUndo(null), 10000);
    return () => clearTimeout(timer);
  }, [undo, busy]);

  const change = async (rentableId, saved, selection = null, isUndo = false) => {
    if (!current || inFlight.current) return;
    if (current.mode === 'other') {
      setError('Use customer login to save places to an account.');
      return;
    }
    const before = current.entries,
      removed = before.find((e) => e.rentableId === rentableId);
    if (saved && !removed && before.length >= SAVED_LIMIT) {
      setError(`You can save up to ${SAVED_LIMIT} places.`);
      return;
    }
    const epoch = generation.current;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const context = validSavedSelection(selection, rentableId);
    setState({
      ...current,
      entries: saved
        ? [
            ...before.filter((e) => e.rentableId !== rentableId),
            removed ?? { rentableId, selection: context, title: 'Saved place', available: false },
          ]
        : before.filter((e) => e.rentableId !== rentableId),
    });
    try {
      let entries;
      if (current.mode === 'customer') {
        const result = await updateSavedPlace(current.scope, {
          rentableId,
          saved,
          selection: context,
        });
        if (result.accountChanged) {
          refresh();
          return;
        }
        if (result.error) throw new Error(result.error);
        entries = result.entries;
      } else {
        if (localStorage.getItem(GUEST_MERGE_OWNER_KEY)) {
          localStorage.removeItem(GUEST_SAVED_KEY);
          localStorage.removeItem(GUEST_MERGE_OWNER_KEY);
        }
        const local = readGuest();
        const existing = local.find((e) => e.rentableId === rentableId);
        const next = local.filter((e) => e.rentableId !== rentableId);
        if (saved)
          next.push({
            rentableId,
            entryId: existing?.entryId ?? crypto.randomUUID(),
            selection: context ?? existing?.selection ?? null,
          });
        if (next.length > SAVED_LIMIT) throw new Error(`You can save up to ${SAVED_LIMIT} places.`);
        writeGuest(next); // A storage failure restores the previous heart and list.
        const result = await loadGuestSavedPlaces(next);
        // The save itself persisted even if public metadata is temporarily unavailable.
        entries =
          result.entries ??
          next.map((e) => ({
            ...e,
            available: false,
            detailsUnavailable: true,
            title: 'Place details temporarily unavailable',
          }));
      }
      if (epoch === generation.current) {
        setState({ ...current, entries });
        setUndo(
          !saved && removed
            ? { entry: removed, scope: current.scope, mode: current.mode }
            : isUndo
              ? null
              : undo,
        );
        try {
          localStorage.setItem(SAVED_SIGNAL_KEY, crypto.randomUUID());
        } catch {}
      }
    } catch (failure) {
      if (epoch === generation.current) {
        setState({ ...current, entries: before });
        setError(failure.message || 'Could not save your change. Please retry.');
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const restore = () => {
    if (undo && current?.scope === undo.scope && current?.mode === undo.mode)
      startTransition(() => change(undo.entry.rentableId, true, undo.entry.selection, true));
  };
  return (
    <Context.Provider
      value={{
        ...identity,
        ...current,
        ready: Boolean(current),
        busy,
        error,
        refresh,
        change,
        undo: restore,
      }}
    >
      {children}
      {error && pathname !== '/saved' ? (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-20 z-[70] mx-auto max-w-md rounded-md border border-danger bg-card p-4 text-ink-900"
        >
          {error}
          <button onClick={refresh} className="ml-3 min-h-11 underline">
            Retry saved places
          </button>
        </div>
      ) : null}
      {undo && current ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-5 z-[70] mx-auto flex max-w-md items-center justify-between gap-4 rounded-md bg-ink-900 p-4 text-white shadow-lg"
        >
          <span>Removed from saved</span>
          <button
            type="button"
            onClick={restore}
            disabled={busy}
            className="min-h-11 px-3 font-semibold underline"
          >
            Undo
          </button>
        </div>
      ) : null}
    </Context.Provider>
  );
}
export function useSavedPlaces() {
  return useContext(Context);
}
