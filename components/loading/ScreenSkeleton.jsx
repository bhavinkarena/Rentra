import Skeleton from '@/components/ui/skeleton';
import { pageWidths } from '@/lib/ui/layout';

// Pending boundaries perform no reads or client effects.
const Block = Skeleton;
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
    <div className={`min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6 ${className}`}>
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
function Cards({ count = 6, rail = false }) {
  return (
    <div
      className={
        rail
          ? 'flex gap-5 overflow-hidden'
          : 'grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={
            rail ? 'w-[80%] min-w-0 shrink-0 sm:w-[42%] lg:w-[calc((100%-3*1.25rem)/4)]' : 'min-w-0'
          }
        >
          <Block className="aspect-4/3 w-full rounded-md" />
          <div className="space-y-3 pt-3">
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
          <Block className="h-11 w-full" />
        </div>
      ))}
      {upload && (
        <div className="grid h-40 place-items-center rounded-xl border-2 border-dashed border-border">
          <Block className="size-10" />
        </div>
      )}
      <Block className="h-11 w-40" />
    </div>
  );
}
function BookingCards() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-[200px_minmax(0,1fr)]"
        >
          <Block className="h-full min-h-56 rounded-none" />
          <div className="min-w-0 space-y-5 p-4 sm:p-5">
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
              {reviews && <Block className="h-4 w-24" />}
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
      {image && <Block className="h-56 w-full rounded-lg sm:h-72" />}
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
              <Block key={i} className="aspect-square w-full" />
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
          <div className="bg-secondary px-4 pt-20 pb-28 sm:px-6 md:pt-28 md:pb-32">
            <div className="mx-auto max-w-(--container-page) space-y-6">
              <Block className="h-6 w-64 rounded-full" />
              <Block className="h-60 max-w-2xl min-[360px]:h-48 sm:h-36 md:h-24" />
              <div className="max-w-prose space-y-3">
                <Block className="h-4 w-full" />
                <Block className="h-4 w-full" />
                <Block className="h-4 w-3/4 sm:hidden" />
              </div>
              <Block className="h-80 max-w-3xl rounded-lg md:h-20 md:rounded-full" />
              <Tabs />
            </div>
          </div>
          <div className="mx-auto -mt-12 max-w-(--container-page) space-y-10 px-4 sm:px-6">
            <Panel>
              <div className="grid gap-5 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Lines key={i} count={2} />
                ))}
              </div>
            </Panel>
            {[0, 1].map((row) => (
              <div key={row} className="space-y-5">
                <Block className="h-6 w-48" />
                <Cards count={4} rail />
              </div>
            ))}
          </div>
        </>
      );
    case 'search':
    case 'location-search':
      return (
        <>
          {screen === 'location-search' && (
            <div className="pt-3 pb-4">
              <Block className="h-8 w-64" />
            </div>
          )}
          <div className="sticky top-17 z-30 -mx-4 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6">
            <div className="grid grid-cols-2 items-center rounded-3xl border border-border bg-ink-50 p-1.5 shadow-sm md:flex md:rounded-full">
              {[0, 1, 2, 3].map((field) => (
                <div
                  key={field}
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-2.5 px-4 py-2 md:px-5"
                >
                  <Block className="size-5 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Block className="h-3 w-12" />
                    <Block className="h-3.5 w-24" />
                  </div>
                </div>
              ))}
              <Block className="col-span-2 m-1 h-12 shrink-0 rounded-full md:w-40" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <Block className="h-10 w-24 rounded-full" />
              <Block className="h-3 w-14" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Block className="h-6 w-28" />
            <div className="flex items-center gap-2">
              <Block className="h-3 w-8" />
              <Block className="h-11 w-40 rounded-full" />
            </div>
          </div>
          <div className="mt-4">
            <Cards count={8} />
          </div>
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
          {/* Full-width 4:3 strip on phones, mosaic from sm (matches PhotoGallery). */}
          <div className="-mx-4 grid aspect-4/3 gap-2 overflow-hidden sm:mx-0 sm:aspect-8/3 sm:grid-cols-2 sm:rounded-lg">
            <Block className="h-full rounded-none" />
            <div className="hidden grid-cols-2 gap-2 sm:grid">
              {[0, 1, 2, 3].map((i) => (
                <Block key={i} className="h-full rounded-none" />
              ))}
            </div>
          </div>
          <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-8">
              <Header />
              <Tabs />
              <Lines count={5} />
              <Panel>
                <Lines count={5} />
              </Panel>
            </div>
            <Panel className="hidden lg:block">
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
                <Block className="mt-6 h-12 w-full" />
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
    case 'content':
      return (
        <>
          <Header />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <Panel key={item}>
                <Block className="mb-6 h-6 w-40" />
                <Lines count={2} />
                <Block className="mt-3 h-6 w-24 rounded-full" />
              </Panel>
            ))}
          </div>
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
            <Block className="h-28 w-full" />
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
          <Block className="order-2 h-60 rounded-xl lg:order-1 lg:h-[640px]" />
          <div className="order-1 mx-auto min-w-0 w-full max-w-md space-y-8 py-8 lg:order-2">
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
          <Block className="mx-auto mb-6 size-16 rounded-full" />
          <div className="mx-auto max-w-md space-y-5">
            <Block className="mx-auto h-8 w-64" />
            <Lines count={3} />
            <Block className="mx-auto h-11 w-40" />
          </div>
        </Panel>
      );
    case 'detail':
      return <Detail />;
    case 'content-editor':
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
          <Block className="h-1 w-full" />
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
  bookings: pageWidths.records,
  dashboard: pageWidths.portal,
  properties: pageWidths.portal,
  'booking-detail': 'max-w-5xl',
  thread: 'max-w-3xl',
  support: 'max-w-4xl',
  'content-editor': 'max-w-4xl',
  team: 'max-w-[1000px]',
  success: 'max-w-2xl',
};
export default function ScreenSkeleton({ screen, label = 'Loading page…', inset = false, layout }) {
  const discovery = screen === 'search' || screen === 'location-search';
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`mx-auto w-full min-w-0 ${screen === 'home' ? '' : (pageWidths[layout] ?? widths[screen] ?? pageWidths.public)} ${inset || screen === 'home' ? '' : discovery ? 'px-4 pt-3 pb-8 sm:px-6 sm:pb-12' : 'px-4 py-6 sm:px-6 sm:py-8'}`}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={discovery ? '' : 'space-y-6'}>
        <Content screen={screen} />
      </div>
    </div>
  );
}
