'use client';
import { useEffect, useState } from 'react';
import { keyboardOccludesViewport } from '@/lib/domain/mobile-viewport';
export default function useMobileKeyboard() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let width = window.innerWidth,
      baseline = window.innerHeight;
    const update = () => {
      if (width !== window.innerWidth) {
        width = window.innerWidth;
        baseline = window.innerHeight;
      }
      baseline = Math.max(baseline, window.innerHeight);
      setOpen(keyboardOccludesViewport(baseline, viewport.height, viewport.scale));
    };
    update();
    viewport.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return open;
}
