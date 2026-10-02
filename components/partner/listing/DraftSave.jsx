'use client';
import { useEffect, useState, useRef } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { saveDraftStep } from '@/lib/actions/partner';
const actions = {
  type: 'type',
  location: 'location',
  space: 'capacity',
  amenities: 'amenities',
  story: 'basics',
  pricing: 'pricing',
  availability: 'availability',
  rules: 'rules',
};
export default function DraftSave({ listing, step, pending, onVersion, onSaving }) {
  const [notice, setNotice] = useState(''),
    [restored, setRestored] = useState(false),
    [expired, setExpired] = useState(false),
    [conflict, setConflict] = useState(false),
    retry = useRef(() => {}),
    busy = useRef(false),
    pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const draft = ['draft', 'rejected'].includes(listing.status) && !listing.hasBookings;
  useEffect(() => {
    const form = document.getElementById('listing-step-form');
    if (!form || !actions[step]) return;
    const key = `rentra:draft:${listing.id}:${step}`,
      action = step === 'space' && listing.rentalUnit === 'hour' ? 'venue' : actions[step];
    let timer,
      stopped = false,
      sequence = 0,
      lastSaved = 0,
      blocked = false,
      resubmit = false;
    const values = () =>
      Array.from(new FormData(form)).filter(
        ([k, v]) =>
          typeof v === 'string' &&
          !['contentVersion', 'expectedVersion', 'expectedCalendarVersion'].includes(k),
      );
    const remember = () => {
      try {
        sessionStorage.setItem(key, JSON.stringify(values()));
      } catch {}
      sequence++;
    };
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const entries = JSON.parse(saved);
        for (const control of form.elements) {
          if (!control.name || ['file', 'hidden', 'submit', 'button'].includes(control.type))
            continue;
          const values = entries.filter(([name]) => name === control.name).map(([, v]) => v);
          if (control.type === 'checkbox' || control.type === 'radio') {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked').set.call(
              control,
              values.includes(control.value),
            );
            control.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (values.length) {
            const proto =
              control instanceof HTMLSelectElement
                ? HTMLSelectElement.prototype
                : control instanceof HTMLTextAreaElement
                  ? HTMLTextAreaElement.prototype
                  : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(control, values[0]);
            control.dispatchEvent(new Event('input', { bubbles: true }));
            control.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        setTimeout(
          () =>
            form.dispatchEvent(
              new CustomEvent('rentra:restore', {
                bubbles: true,
                detail: Object.fromEntries(entries),
              }),
            ),
          0,
        );
        setTimeout(() => setRestored(true), 0);
        sequence++;
      } catch {}
    }
    const save = async () => {
      clearTimeout(timer);
      if (
        !draft ||
        stopped ||
        busy.current ||
        pendingRef.current ||
        blocked ||
        sequence === lastSaved
      )
        return;
      if (!navigator.onLine) {
        setNotice('Offline — will save when connected');
        return;
      }
      busy.current = true;
      onSaving?.(true);
      const saving = sequence;
      setNotice('Saving…');
      const data = new FormData(form);
      data.set('direct', 'true');
      try {
        const result = await saveDraftStep(action, data);
        if (stopped) return;
        if (result.ok) {
          lastSaved = saving;
          onVersion?.(result.contentVersion, result.version ?? result.result?.version);
          setNotice(
            `Saved ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
          );
          if (sequence === saving) {
            sessionStorage.removeItem(key);
            form.dispatchEvent(new Event('rentra:form-saved', { bubbles: true }));
          }
        } else {
          // Half-typed input is normal while autosaving; field errors appear on Continue.
          setNotice(
            result.errors
              ? 'Draft not saved yet — finish the fields to save'
              : result.error || 'Not saved — retry',
          );
          if (['SESSION_EXPIRED', 'UNAUTHENTICATED', 'UNAUTHORIZED'].includes(result.code))
            setExpired(true);
          if (['LISTING_CHANGED', 'CONFIG_CHANGED'].includes(result.code)) {
            blocked = true;
            setConflict(true);
          }
        }
      } catch {
        if (!stopped) setNotice('Not saved — retry');
      } finally {
        busy.current = false;
        onSaving?.(false);
        if (resubmit && !stopped) {
          // Continue was pressed mid-autosave: send it now, with the version that save returned.
          resubmit = false;
          form.requestSubmit();
        } else if (!stopped && sequence !== saving && !blocked) timer = setTimeout(save, 1500);
      }
    };
    retry.current = save;
    const change = () => {
      remember();
      if (draft) {
        clearTimeout(timer);
        timer = setTimeout(save, 1500);
      }
    };
    const blur = (e) => {
      // Tapping Continue blurs the field first; the explicit save covers it.
      if (draft && e.relatedTarget?.type !== 'submit') save();
    };
    const submit = (e) => {
      clearTimeout(timer);
      if (!busy.current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      resubmit = true;
    };
    const leave = (e) => {
      const link = e.target.closest?.('a[href]');
      if (link && draft && sequence !== lastSaved) save();
    };
    const explicitSaved = () => {
      if (!busy.current) {
        sessionStorage.removeItem(key);
        lastSaved = sequence;
      }
    };
    form.addEventListener('rentra:form-saved', explicitSaved);
    form.addEventListener('submit', submit, true);
    form.addEventListener('input', change);
    form.addEventListener('change', change);
    form.addEventListener('focusout', blur);
    document.addEventListener('click', leave, true);
    window.addEventListener('online', save);
    return () => {
      stopped = true;
      clearTimeout(timer);
      form.removeEventListener('rentra:form-saved', explicitSaved);
      form.removeEventListener('submit', submit, true);
      form.removeEventListener('input', change);
      form.removeEventListener('change', change);
      form.removeEventListener('focusout', blur);
      document.removeEventListener('click', leave, true);
      window.removeEventListener('online', save);
    };
  }, [
    listing.id,
    listing.status,
    listing.hasBookings,
    listing.rentalUnit,
    step,
    draft,
    onVersion,
    onSaving,
  ]);
  return (
    <div aria-live="polite" className="text-tiny text-ink-600">
      {restored && (
        <p>
          We restored what you typed.{' '}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              sessionStorage.removeItem(`rentra:draft:${listing.id}:${step}`);
              window.location.reload();
            }}
          >
            Discard recovered typing
          </button>
        </p>
      )}
      {notice && <p>{notice}</p>}
      {notice.includes('Not saved') && (
        <button type="button" className="min-h-11 underline" onClick={() => retry.current()}>
          Retry save
        </button>
      )}
      {expired && (
        <Link
          href={`/partner/login?next=${encodeURIComponent(`/partner/listings/${listing.id}/setup/${step}`)}`}
          className="min-h-11 underline"
        >
          Your session ended. Sign in again
        </Link>
      )}
      {conflict && (
        <button
          type="button"
          className="min-h-11 underline"
          onClick={() => window.location.reload()}
        >
          Load latest
        </button>
      )}
    </div>
  );
}
