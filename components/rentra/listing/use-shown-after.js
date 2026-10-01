'use client';

import { useEffect, useState } from 'react';

/**
 * True once the element with `sentinelId` (the gallery end) has scrolled above
 * the viewport. Shared by the farmhouse and venue mobile booking bars.
 */
export function useShownAfter(sentinelId) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);

    if (sentinel) {
      // An observer always delivers an initial entry, so the correct state
      // arrives from the callback — nothing has to be seeded by hand here.
      const observer = new IntersectionObserver(
        ([entry]) => setShown(entry.boundingClientRect.top < 0 && !entry.isIntersecting),
        { threshold: 0 },
      );
      observer.observe(sentinel);
      return () => observer.disconnect();
    }

    /**
     * No sentinel means an unexpected page shape. Fall back to scroll depth
     * rather than silently losing the only booking CTA on a phone. The first
     * reading is taken in a frame callback, not in the effect body: setting
     * state synchronously here would cascade an extra render on every mount.
     */
    const onScroll = () => setShown(window.scrollY > 320);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [sentinelId]);
  return shown;
}
