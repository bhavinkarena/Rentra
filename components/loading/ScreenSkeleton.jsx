// No data reads or client effects: loading boundaries must render immediately.
function Block({ className = '' }) {
  return <span className={`block max-w-full rounded-md bg-ink-100 ${className}`} />;
}
function Lines({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Block key={i} className={`h-3 ${i === count - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
function Header({ action = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-3">
        <Block className="h-3 w-24" />
        <Block className="h-8 w-64" />
        <Block className="h-3 w-96" />
      </div>
      {action && <Block className="hidden h-11 w-32 sm:block" />}
    </div>
  );
}
function Panel({ children, className = '' }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
function Tabs() {
  return (
    <div className="flex min-w-0 gap-2 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <Block key={i} className="h-9 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}
function Filters() {
  return (
    <Panel>
      <div className="flex flex-wrap gap-3">
        <Block className="h-11 min-w-32 flex-1" />
        <Block className="h-11 w-28" />
        <Block className="h-11 w-24" />
      </div>
    </Panel>
  );
}
function Stats({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${count === 3 ? 'lg:grid-cols-3' : 'xl:grid-cols-4'}`}>
      {Array.from({ length: count }, (_, i) => (
        <Panel key={i}>
          <Block className="h-3 w-24" />
          <Block className="my-4 h-8 w-16" />
          <Block className="h-3 w-32" />
        </Panel>
      ))}
    </div>
  );
}
function Table({ people = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex gap-8 border-b border-border bg-ink-25 p-4">
        <Block className="h-3 w-1/3" />
        <Block className="h-3 w-1/4" />
        <Block className="h-3 w-1/5" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
          {people && <Block className="size-10 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Block className="h-3 w-44" />
            <Block className="h-2.5 w-28" />
          </div>
          <Block className="hidden h-3 w-28 md:block" />
          <Block className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
function Cards({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Block className="aspect-4/3 w-full rounded-none" />
          <div className="space-y-4 p-4">
            <Lines count={2} />
            <div className="flex justify-between">
              <Block className="h-5 w-24" />
              <Block className="h-4 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
function Fields({ count = 4, upload = false }) {
  return (
    <div className="min-w-0 space-y-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2">
          <Block className="h-3 w-28" />
          <Block className="h-11 w-full bg-ink-50" />
        </div>
      ))}
      {upload && (
        <div className="grid h-40 place-items-center rounded-xl border-2 border-dashed border-border">
          <Block className="size-10" />
        </div>
      )}
      <Block className="h-11 w-40 bg-brand-100" />
    </div>
  );
}
function BookingCards() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[240px_1fr]"
        >
          <Block className="h-44 rounded-none sm:h-full sm:min-h-56" />
          <div className="space-y-5 p-5 sm:p-6">
            <Block className="h-6 w-24 rounded-full" />
            <Block className="h-6 w-3/4" />
            <Lines count={2} />
            <div className="flex justify-between border-t border-border pt-4">
              <Block className="h-6 w-28" />
              <Block className="h-4 w-24" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
function Feed({ reviews = false }) {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <Panel key={i}>
          <div className="flex gap-4">
            <Block className={`size-10 shrink-0 ${reviews ? 'rounded-full' : ''}`} />
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex justify-between gap-4">
                <Block className="h-4 w-44" />
                <Block className="h-3 w-16" />
              </div>
              {reviews && <Block className="h-4 w-24 bg-brand-100" />}
              <Lines count={2} />
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
function Detail({ image = false }) {
  return (
    <>
      <Block className="h-4 w-28" />
      {image && <Block className="h-56 w-full rounded-2xl sm:h-72" />}
      <Header action />
      <Tabs />
      <div className="grid items-start gap-5 md:grid-cols-2">
        <Panel>
          <Lines count={5} />
        </Panel>
        <Panel>
          <Lines count={5} />
        </Panel>
        <Panel className="md:col-span-2">
          <Block className="mb-5 h-5 w-40" />
          <Lines count={6} />
        </Panel>
      </div>
    </>
  );
}
function Calendar() {
  return (
    <>
      <Header />
      <Filters />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel>
          <div className="mb-6 flex justify-between">
            <Block className="h-8 w-8" />
            <Block className="h-7 w-40" />
            <Block className="h-8 w-8" />
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Block key={i} className="mb-2 h-3 w-8" />
            ))}
            {Array.from({ length: 35 }, (_, i) => (
              <Block key={i} className="aspect-square w-full bg-ink-50" />
            ))}
          </div>
        </Panel>
        <Panel>
          <Block className="mb-5 h-5 w-32" />
          <Lines count={4} />
          <Block className="mt-6 h-11 w-full" />
        </Panel>
      </div>
    </>
  );
}
function Content({ screen }) {
  switch (screen) {
    case 'home':
      return (
        <>
          <div className="space-y-6 rounded-2xl bg-brand-50 px-6 py-16 sm:py-24">
            <Block className="h-12 w-3/4 bg-brand-100" />
            <Block className="h-5 w-1/2" />
            <Block className="h-16 w-full max-w-3xl rounded-full bg-white" />
          </div>
          <Header />
          <Cards count={3} />
        </>
      );
    case 'search':
      return (
        <>
          <Header />
          <Filters />
          <div className="flex justify-between">
            <Block className="h-4 w-40" />
            <Block className="h-10 w-36" />
          </div>
          <Cards />
        </>
      );
    case 'saved':
      return (
        <>
          <Header />
          <Tabs />
          <Cards />
        </>
      );
    case 'listing':
      return (
        <>
          <Block className="h-4 w-48" />
          <div className="grid h-64 gap-2 overflow-hidden rounded-2xl sm:h-96 sm:grid-cols-2">
            <Block className="h-full rounded-none" />
            <div className="hidden grid-cols-2 gap-2 sm:grid">
              {[0, 1, 2, 3].map((i) => (
                <Block key={i} className="h-full rounded-none" />
              ))}
            </div>
          </div>
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-8">
              <Header />
              <Tabs />
              <Lines count={5} />
              <Panel>
                <Lines count={5} />
              </Panel>
            </div>
            <Panel>
              <Block className="mb-6 h-9 w-40" />
              <Tabs />
              <div className="mt-5">
                <Fields count={3} />
              </div>
            </Panel>
          </div>
        </>
      );
    case 'bookings':
      return (
        <>
          <Header />
          <Filters />
          <Tabs />
          <BookingCards />
        </>
      );
    case 'booking-detail':
      return <Detail image />;
    case 'checkout':
      return (
        <>
          <Block className="h-4 w-36" />
          <Header />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <Panel>
                <Block className="mb-6 h-6 w-44" />
                <Fields count={2} />
              </Panel>
              <Panel>
                <Block className="mb-6 h-6 w-40" />
                <Tabs />
                <Block className="mt-6 h-12 w-full bg-brand-100" />
              </Panel>
            </div>
            <Panel>
              <Block className="mb-5 aspect-video w-full" />
              <Lines count={3} />
              <div className="my-6 border-t border-border" />
              <Lines count={5} />
            </Panel>
          </div>
        </>
      );
    case 'dashboard':
      return (
        <>
          <Header action />
          <Stats />
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Table />
            <Feed />
          </div>
        </>
      );
    case 'properties':
      return (
        <>
          <Header action />
          <Stats />
          <Filters />
          <Table people />
        </>
      );
    case 'people':
      return (
        <>
          <Header action />
          <Filters />
          <Tabs />
          <Table people />
        </>
      );
    case 'finance':
      return (
        <>
          <Header />
          <Stats count={3} />
          <Tabs />
          <Table />
        </>
      );
    case 'payments':
      return (
        <>
          <Header />
          <Filters />
          <Stats count={3} />
          <Table />
        </>
      );
    case 'table':
      return (
        <>
          <Header action />
          <Filters />
          <Tabs />
          <Table />
        </>
      );
    case 'profile':
      return (
        <>
          <Block className="h-4 w-24" />
          <Panel>
            <div className="flex gap-5">
              <Block className="size-20 shrink-0 rounded-full" />
              <div className="flex-1 space-y-3">
                <Block className="h-7 w-48" />
                <Lines count={2} />
              </div>
            </div>
          </Panel>
          <Tabs />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel>
              <Fields count={3} />
            </Panel>
            <Panel>
              <Lines count={6} />
            </Panel>
          </div>
        </>
      );
    case 'account':
      return (
        <>
          <Header />
          <Stats count={3} />
          <div className="grid items-start gap-5 md:grid-cols-2">
            <Panel>
              <Block className="mb-6 size-20 rounded-full" />
              <Fields count={3} />
            </Panel>
            <Feed />
          </div>
        </>
      );
    case 'calendar':
      return <Calendar />;
    case 'updates':
      return (
        <>
          <Header action />
          <Tabs />
          <Feed />
        </>
      );
    case 'reviews':
      return (
        <>
          <Header />
          <Stats count={3} />
          <Tabs />
          <Feed reviews />
        </>
      );
    case 'review-detail':
      return (
        <>
          <Header />
          <Feed reviews />
          <Panel>
            <Fields count={2} />
          </Panel>
        </>
      );
    case 'support':
      return (
        <>
          <Header action />
          <Filters />
          {[0, 1, 2, 3].map((i) => (
            <Panel key={i}>
              <Block className="mb-3 h-5 w-2/3" />
              <Lines count={2} />
            </Panel>
          ))}
        </>
      );
    case 'thread':
      return (
        <>
          <Block className="h-4 w-32" />
          <Header />
          <Tabs />
          <Panel>
            <Lines count={3} />
          </Panel>
          <div className="space-y-4">
            <Panel className="mr-8">
              <Lines count={3} />
            </Panel>
            <Panel className="ml-8">
              <Lines count={2} />
            </Panel>
          </div>
          <Panel>
            <Block className="h-28 w-full bg-ink-50" />
            <Block className="mt-4 h-11 w-32" />
          </Panel>
        </>
      );
    case 'case-detail':
      return (
        <>
          <Header />
          <Stats count={3} />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-5">
              <Panel>
                <Lines count={5} />
              </Panel>
              <Feed />
            </div>
            <Panel>
              <Fields count={3} />
            </Panel>
          </div>
        </>
      );
    case 'team':
      return (
        <>
          <Header />
          <Panel>
            <Fields count={2} />
          </Panel>
          <Table people />
        </>
      );
    case 'settings':
      return (
        <>
          <Header />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-5">
              <Panel>
                <Fields count={3} />
              </Panel>
              <Panel>
                <Fields count={2} />
              </Panel>
            </div>
            <Panel>
              <Lines count={4} />
            </Panel>
          </div>
        </>
      );
    case 'document':
      return (
        <>
          <Block className="h-4 w-28" />
          <Header />
          <Panel>
            <Block className="mb-6 h-5 w-40" />
            <Lines count={8} />
            <Block className="my-7 h-5 w-48" />
            <Lines count={8} />
          </Panel>
        </>
      );
    case 'help':
      return (
        <>
          <Header />
          <Filters />
          {[0, 1, 2, 3, 4].map((i) => (
            <Panel key={i}>
              <Block className="h-5 w-3/4" />
            </Panel>
          ))}
        </>
      );
    case 'auth':
      return (
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <Block className="h-48 rounded-[2rem] bg-brand-100 sm:h-64 lg:h-[700px]" />
          <div className="mx-auto min-w-0 w-full max-w-md space-y-8 py-8">
            <Header />
            <Fields count={2} />
            <Lines count={2} />
          </div>
        </div>
      );
    case 'login':
      return (
        <Panel>
          <Header />
          <div className="mt-8">
            <Fields count={2} />
          </div>
        </Panel>
      );
    case 'upload':
      return (
        <>
          <Header />
          <Panel>
            <Fields count={2} upload />
          </Panel>
        </>
      );
    case 'consent':
      return (
        <>
          <Header />
          <Panel>
            <Lines count={7} />
            <div className="my-6 flex gap-3">
              <Block className="size-5 shrink-0" />
              <Block className="h-4 w-4/5" />
            </div>
            <Block className="h-11 w-40" />
          </Panel>
        </>
      );
    case 'success':
      return (
        <Panel className="py-12">
          <Block className="mx-auto mb-6 size-16 rounded-full bg-brand-100" />
          <div className="mx-auto max-w-md space-y-5">
            <Block className="mx-auto h-8 w-64" />
            <Lines count={3} />
            <Block className="mx-auto h-11 w-40" />
          </div>
        </Panel>
      );
    case 'detail':
      return <Detail />;
    case 'form':
      return (
        <>
          <Header />
          <Panel>
            <Fields />
          </Panel>
        </>
      );
    default:
      return (
        <>
          <Block className="h-1 w-full bg-brand-100" />
          <span className="sr-only">Opening page</span>
        </>
      );
  }
}
const widths = {
  auth: 'max-w-7xl',
  login: 'max-w-md',
  form: 'max-w-3xl',
  upload: 'max-w-3xl',
  consent: 'max-w-3xl',
  document: 'max-w-3xl',
  help: 'max-w-3xl',
  bookings: 'max-w-5xl',
  'booking-detail': 'max-w-5xl',
  thread: 'max-w-3xl',
  support: 'max-w-4xl',
  team: 'max-w-[1000px]',
  success: 'max-w-2xl',
};
export default function ScreenSkeleton({ screen, label = 'Loading page', inset = false }) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`mx-auto w-full min-w-0 ${widths[screen] ?? 'max-w-(--container-page)'} ${inset ? '' : 'px-4 py-6 sm:px-6 sm:py-8'}`}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <Content screen={screen} />
      </div>
    </div>
  );
}
