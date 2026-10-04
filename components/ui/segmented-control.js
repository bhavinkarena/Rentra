export const segmentedTrack =
  'inline-flex min-h-11 items-stretch gap-1 rounded-2xl border border-border bg-ink-25 p-1';

export const segmentedItem = (active) =>
  `inline-flex min-h-9 min-w-11 items-center justify-center rounded-xl px-3 text-meta font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border border-border bg-card text-ink-900 shadow-sm' : 'border border-transparent text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`;
