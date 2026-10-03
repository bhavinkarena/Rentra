'use client';
import { useEffect, useRef, useState, useActionState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { recordOwnerGuide } from '@/lib/actions/partner';
import FormError from '@/components/portal/FormError';
import { Button } from '@/components/ui/button';
const stops = [
  ['#owner-today-card', 'Dashboard', 'See your next verification step, tasks and arrivals here.'],
  [
    'a[href="/partner/listings"]',
    'Properties',
    'Start a property draft now. Submit it once your account is approved.',
  ],
  [
    'a[href="/partner/calendar"]',
    'Calendar',
    'After approval, set booking hours, open dates and close dates you need for yourself.',
  ],
  [
    'a[href="/partner/bookings"]',
    'Bookings',
    'After approval, manage guest visits and see payment records here.',
  ],
  [
    'a[href="/partner/help"]',
    'Help & support',
    'Find guides and contact Rentra. You can restart this tour here.',
  ],
];
export default function OwnerTour({ guide = {} }) {
  const router = useRouter();
  const requested = useSearchParams().get('tour') === '1';
  const booted = useRef(false);
  const queryStarted = useRef(false);
  const dialog = useRef(null);
  const [index, setIndex] = useState(-1);
  const [state, action, pending] = useActionState(async (_previous, form) => {
    const result = await recordOwnerGuide({ [form.get('event')]: true });
    if (!result.error && !result.errors) setIndex(-1);
    return result;
  }, {});
  useEffect(() => {
    if (requested && queryStarted.current) return;
    if (!requested) queryStarted.current = false;
    if (!requested && booted.current) return;
    booted.current = true;
    const unfinished = guide.tourStartedAt && !guide.tourCompletedAt && !guide.tourSkippedAt;
    if (requested) {
      queryStarted.current = true;
      recordOwnerGuide({ tourStartedAt: true }).then(() => {
        setIndex(0);
        router.replace('/partner', { scroll: false });
      });
    } else if (unfinished && !guide.tourResumedAt) {
      recordOwnerGuide({ tourResumedAt: true });
      queueMicrotask(() => setIndex(0));
    } else if (unfinished) recordOwnerGuide({ tourSkippedAt: true });
  }, [guide, requested, router]);
  useEffect(() => {
    if (index < 0) return;
    const el = dialog.current;
    const target = [...document.querySelectorAll(stops[index][0])].find(
      (node) => node.getBoundingClientRect().width > 0,
    );
    const bounds = target?.getBoundingClientRect();
    const anchored =
      target &&
      CSS.supports('position-anchor', '--owner-tour') &&
      CSS.supports('left', 'anchor(right)');
    const anchorStyle = document.createElement('style');
    if (anchored) {
      // Keep anchor names in CSS so React can hydrate the page during tour navigation.
      anchorStyle.textContent = `@media (min-width: 768px) { ${stops[index][0]} { anchor-name: --owner-tour; } }`;
      document.head.append(anchorStyle);
      el.style.positionAnchor = '--owner-tour';
    }
    if (bounds && window.innerWidth >= 768) {
      el.style.margin = '0';
      el.style.left = anchored
        ? 'clamp(16px, calc(anchor(right) + 12px), calc(100vw - 376px))'
        : `${Math.min(window.innerWidth - 376, Math.max(16, bounds.right + 12))}px`;
      el.style.top = anchored
        ? 'clamp(16px, anchor(top), calc(100vh - 300px))'
        : `${Math.min(window.innerHeight - 300, Math.max(16, bounds.top))}px`;
    } else {
      el.style.margin = 'auto';
      el.style.left = '0';
      el.style.top = '0';
    }
    el.showModal();
    return () => {
      el.close();
      anchorStyle.remove();
    };
  }, [index]);
  if (index < 0) return null;
  const [, title, body] = stops[index];
  return (
    <dialog
      ref={dialog}
      aria-labelledby="owner-tour-title"
      aria-describedby="owner-tour-body"
      aria-modal="true"
      className="fixed w-[calc(100%_-_2rem)] max-w-sm rounded-lg border border-border bg-card p-6 text-ink-900 shadow-xl backdrop:bg-black/30"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0],
          last = buttons.at(-1);
        if (
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last) ||
          !dialog.current.contains(document.activeElement)
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) dialog.current.querySelector('button[value="tourSkippedAt"]').click();
      }}
    >
      <p className="text-meta text-ink-500">
        {index + 1} of {stops.length}
      </p>
      <h2 id="owner-tour-title" className="mt-2 text-h3">
        {title}
      </h2>
      <p id="owner-tour-body" className="mt-3 text-body text-ink-600">
        {body}
      </p>
      <FormError state={state} />
      <form action={action} className="mt-5 flex items-center justify-between gap-3">
        <button
          name="event"
          value="tourSkippedAt"
          disabled={pending}
          className="min-h-11 text-meta text-ink-600"
        >
          Skip tour
        </button>
        {index < stops.length - 1 ? (
          <Button
            key="next"
            type="button"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setIndex(index + 1);
            }}
          >
            Next
          </Button>
        ) : (
          <Button key="finish" name="event" value="tourCompletedAt" disabled={pending}>
            Finish tour
          </Button>
        )}
      </form>
    </dialog>
  );
}
