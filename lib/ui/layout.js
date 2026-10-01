export const pageWidths = {
  public: 'max-w-(--container-page)',
  portal: 'max-w-(--container-workspace)',
  settings: 'max-w-[1240px]',
  reading: 'max-w-3xl',
  records: 'max-w-5xl',
  wizard: 'max-w-[1180px]',
};

// Shared geometry for both discovery homes and their pending state.
export const homeHero = {
  content: 'mx-auto max-w-(--container-page) px-4 pt-20 pb-24 sm:px-6 md:pt-28 md:pb-32',
  badge:
    'mb-4 flex w-fit min-h-[calc(2lh+0.5rem)] items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-tiny font-semibold text-brand-100 ring-1 ring-white/20 backdrop-blur min-[360px]:min-h-[calc(1lh+0.5rem)]',
  title:
    'min-h-[5lh] max-w-2xl text-display text-wrap text-white min-[360px]:min-h-[4lh] min-[390px]:min-h-[3lh] sm:min-h-[2lh]',
  description:
    'mt-4 min-h-[4lh] max-w-prose text-body-lg text-brand-100 min-[390px]:min-h-[3lh] sm:min-h-[2lh]',
  chips:
    '-mx-4 mt-6 flex min-h-11 gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0',
};
