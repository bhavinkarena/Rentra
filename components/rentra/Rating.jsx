import { Star } from 'lucide-react';

/**
 * Never render a rating before real reviews exist — an empty "0.0 (0)" is
 * worse than no badge, and fake structured-data ratings get sites penalised.
 */
export default function Rating({ value, count, className = '' }) {
  if (!count || count < 1) {
    return (
      <span className={`text-meta text-ink-500 ${className}`}>No reviews yet</span>
    );
  }

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 text-meta font-semibold tabular ${className}`}
    >
      <Star
        className="size-3.5 shrink-0 translate-y-0.5 fill-amber-500 text-amber-500"
        aria-hidden="true"
      />
      {value.toFixed(1)}
      <span className="font-normal text-ink-500">({count})</span>
    </span>
  );
}
