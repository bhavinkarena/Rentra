import Link from 'next/link';

const style = 'min-h-11 rounded-md border border-border bg-card px-3 py-2';
const time = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
const add = (day, offset) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + offset * 86400000).toISOString().slice(0, 10);
const tones = {
  booking: 'border-blue-300 bg-blue-50 text-blue-950',
  held: 'border-amber-300 bg-amber-50 text-amber-950',
  owner_block: 'border-red-300 bg-red-50 text-red-950',
};

function Interval({ interval, property }) {
  const kind =
    interval.source === 'owner_block'
      ? 'owner_block'
      : interval.state === 'held'
        ? 'held'
        : 'booking';
  const label = { owner_block: 'Owner block', held: 'Temporary hold', booking: 'Booked visit' }[
    kind
  ];
  return (
    <details className={`rounded-md border p-3 ${tones[kind]}`}>
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        {label}
        {interval.slot ? ` · ${interval.slot.replace('_', ' ')}` : ''}
        <span className="block text-xs font-normal">
          {time(interval.blocked_start_at)} – {time(interval.blocked_end_at)}
        </span>
      </summary>
      <div className="mt-3 space-y-2 text-sm">
        {interval.reason && <p>{interval.reason}</p>}
        {interval.starts_at && (
          <p>
            Visit: {time(interval.starts_at)} – {time(interval.ends_at)}
          </p>
        )}
        {interval.starts_at &&
          +new Date(interval.blocked_start_at) < +new Date(interval.starts_at) && (
            <p className="rounded border border-dashed p-2">
              Buffer before: {time(interval.blocked_start_at)} – {time(interval.starts_at)}
            </p>
          )}
        {interval.ends_at && +new Date(interval.ends_at) < +new Date(interval.blocked_end_at) && (
          <p className="rounded border border-dashed p-2">
            Buffer after: {time(interval.ends_at)} – {time(interval.blocked_end_at)}
          </p>
        )}
        {kind === 'held' && (
          <p>
            Hold expires: {time(interval.hold_expires_at)}. Expired holds are excluded when you
            refresh.
          </p>
        )}
        {interval.order_id && (
          <Link
            className="inline-block min-h-11 underline"
            href={`/partner/bookings/${interval.order_id}`}
          >
            Open booking record
          </Link>
        )}
        {kind === 'owner_block' && (
          <Link
            className="inline-block min-h-11 underline"
            href={`/partner/listings/${property.id}/calendar#block-${interval.id}`}
          >
            Review or release this owner block
          </Link>
        )}
        {kind !== 'owner_block' && <p>Calendar controls cannot release this reservation.</p>}
      </div>
    </details>
  );
}

export default function PortfolioCalendar({
  data,
  basePath = '/partner/calendar',
  view = 'week',
  listHref,
}) {
  const days = Array.from({ length: data.days }, (_, i) => add(data.from, i));
  const link = (changes) =>
    `${basePath}?${new URLSearchParams({ from: data.from, days: String(data.days), view, slot: data.slot, ...(data.property ? { property: data.property } : {}), ...(listHref ? { fromList: listHref } : {}), ...changes })}`;
  return (
    <section className="space-y-5" aria-label="Property calendar">
      <form className="flex flex-wrap items-end gap-3">
        {listHref && <input type="hidden" name="fromList" value={listHref} />}
        <label className="grid gap-1 text-sm">
          Start date
          <input className={style} name="from" type="date" defaultValue={data.from} required />
        </label>
        <label className="grid gap-1 text-sm">
          View
          <select className={style} name="view" defaultValue={view}>
            <option value="agenda">Agenda list</option>
            <option value="week">Week</option>
            <option value="month">Month (31 days)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Slot
          <select className={style} name="slot" defaultValue={data.slot}>
            <option value="">All slots</option>
            <option value="day">Day picnic</option>
            <option value="night">Overnight</option>
            <option value="full_day">Full day</option>
          </select>
        </label>
        {basePath === '/partner/calendar' && (
          <label className="grid gap-1 text-sm">
            Property
            <select className={style} name="property" defaultValue={data.property}>
              <option value="">All properties</option>
              {data.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className={`${style} font-semibold`}>Show calendar</button>
      </form>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="min-h-11 underline" href={link({ from: add(data.from, -data.days) })}>
          Previous period
        </Link>
        <Link className="min-h-11 underline" href={link({ from: add(data.from, data.days) })}>
          Next period
        </Link>
        <Link
          className="min-h-11 underline"
          href={link({ view: view === 'agenda' ? 'week' : 'agenda' })}
        >
          {view === 'agenda' ? 'Visual calendar' : 'Accessible agenda list'}
        </Link>
      </div>
      <p className="text-sm text-ink-600">
        All times are India time. Blue: booked visit · Amber: temporary hold · Red: owner block ·
        Dashed: buffer · Purple: price override. Expand an interval for its source and actions. Open
        dates still require confirmed hours and a successful availability check at checkout.
      </p>
      {!data.items.length && (
        <p className="rounded-lg border border-border p-5">
          No properties match this calendar filter.
        </p>
      )}
      {data.items.map((property) => (
        <article key={property.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">
              <Link className="underline" href={`/partner/listings/${property.id}/overview`}>
                {property.title}
              </Link>
            </h2>
            <Link
              className="min-h-11 text-sm underline"
              href={`/partner/listings/${property.id}/calendar#calendar-settings`}
            >
              Manage dates and prices
            </Link>
          </div>
          {property.unresolvedVisits?.length > 0 && (
            <p className="text-sm">
              Some visits need calendar reconciliation:{' '}
              {property.unresolvedVisits.map((v) =>
                v.orderId ? (
                  <Link
                    key={v.id}
                    className="mr-3 underline"
                    href={`/partner/bookings/${v.orderId}`}
                  >
                    Open visit record
                  </Link>
                ) : (
                  <span key={v.id}>Contact Rentra about this legacy visit. </span>
                ),
              )}
            </p>
          )}
          {!property.scheduleReady && (
            <p className="text-sm">
              Booking hours need confirmation before this property can accept bookings.
            </p>
          )}
          <div
            className={view === 'agenda' ? 'space-y-3' : 'grid gap-2 sm:grid-cols-2 xl:grid-cols-7'}
          >
            {days.map((day) => {
              const start = +new Date(`${day}T00:00:00+05:30`),
                end = start + 86400000;
              const intervals = property.intervals.filter(
                (r) => +new Date(r.blocked_start_at) < end && +new Date(r.blocked_end_at) > start,
              );
              const overrides = property.overrides.filter((r) => r.day === day);
              const slots = data.slot && data.slot !== 'full_day' ? [data.slot] : ['day', 'night'];
              return (
                <section
                  key={day}
                  className="min-w-0 space-y-2 rounded-lg border border-border bg-card p-3"
                  aria-label={day}
                >
                  <h3 className="text-sm font-semibold">
                    <time dateTime={day}>
                      {new Intl.DateTimeFormat('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        weekday: 'short',
                        timeZone: 'UTC',
                      }).format(new Date(`${day}T00:00:00Z`))}
                    </time>
                  </h3>
                  {slots.map((slot) => {
                    const row = property.availability.find((r) => r.day === day && r.slot === slot);
                    return (
                      <p className="text-xs" key={slot}>
                        {slot === 'day' ? 'Day' : 'Night'}:{' '}
                        {!row
                          ? 'Closed (not opened)'
                          : row.blocked_by_client
                            ? 'Owner closed'
                            : row.units_available <= 0
                              ? 'Unavailable'
                              : 'Open date'}
                      </p>
                    );
                  })}
                  {intervals.map((interval) => (
                    <Interval key={interval.id} interval={interval} property={property} />
                  ))}
                  {overrides.map((o) => (
                    <details
                      key={o.slot}
                      className="rounded border border-purple-300 bg-purple-50 p-2 text-sm text-purple-950"
                    >
                      <summary className="min-h-11 cursor-pointer">
                        Price override · {o.slot.replace('_', ' ')} · ₹{o.rent_minor / 100}
                      </summary>
                      <p>
                        Applies to new quotes for visits starting {o.day}. Accepted bookings keep
                        their price.
                      </p>
                      <Link
                        className="inline-block min-h-11 underline"
                        href={`/partner/listings/${property.id}/calendar#price-override`}
                      >
                        Edit or reset date price
                      </Link>
                    </details>
                  ))}
                </section>
              );
            })}
          </div>
        </article>
      ))}
      <nav aria-label="Calendar property pages" className="flex gap-4">
        {data.page > 1 && (
          <Link className="min-h-11 underline" href={link({ page: String(data.page - 1) })}>
            Previous properties
          </Link>
        )}
        {data.hasMore && (
          <Link className="min-h-11 underline" href={link({ page: String(data.page + 1) })}>
            More properties
          </Link>
        )}
      </nav>
    </section>
  );
}
