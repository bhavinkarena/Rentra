'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './home.module.css';

/** Server-rendered cards inside a native touch/trackpad/keyboard scrolling rail. */
export default function PlaceCarousel({ children, count }) {
  const rail = useRef(null);
  const [position, setPosition] = useState({ first: true, last: count < 2, start: 1 });
  useEffect(() => {
    const element = rail.current;
    const update = () => {
      const width = element.firstElementChild?.getBoundingClientRect().width || 1;
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      setPosition({
        first: element.scrollLeft < 2,
        last: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
        start: Math.min(count, Math.round(element.scrollLeft / (width + gap)) + 1),
      });
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [count]);
  function move(direction) {
    const element = rail.current;
    const card = element.firstElementChild;
    if (!card) return;
    const step =
      card.getBoundingClientRect().width + (parseFloat(getComputedStyle(element).columnGap) || 0);
    element.scrollBy({
      left: direction * step,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label="Places to explore"
    >
      <div
        className={styles.rail}
        ref={rail}
        tabIndex={0}
        aria-label="Property cards; use arrow keys to scroll"
      >
        {children}
      </div>
      <div className={styles.railFooter}>
        <span className={styles.railCount} aria-live="polite" aria-atomic="true">
          {String(position.start).padStart(2, '0')} <span>/ {count} places to explore</span>
        </span>
        <div className={styles.railControls}>
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={position.first}
            aria-label="Previous properties"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={position.last}
            aria-label="Next properties"
          >
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
