'use client';
import { useEffect } from 'react';
import { measureBrowser } from '@/lib/domain/browser-measurement';

export default function MeasuredView({ event }) {
  useEffect(() => {
    measureBrowser(event);
  }, [event]);
  return null;
}
