'use client';
import { cn } from 'cn';
import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { savePricing } from '@/lib/actions/partner';
import { hhmmToMinute, minuteToHhmm, priceGaps } from '@/lib/domain/hourly';
import { ActivityIcon } from '@/components/rentra/icons/activity-icons';
import { usePolicyAction } from './PolicyPreview';
import { useStepFormId } from './chrome';
import { VersionField, Input, Section, SaveButton, inputCls } from './SectionPrimitives';

const KINDS = [
  ['weekday', 'Mon–Fri'],
  ['weekend', 'Sat–Sun'],
];
const DAY_SHORT = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};
let seq = 0;
const key = () => `band-${(seq += 1)}`;

/** Earliest open and latest close over the days of one kind, for presets. */
function spanFor(config, kind) {
  const days = kind === 'weekend' ? ['sat', 'sun'] : ['mon', 'tue', 'wed', 'thu', 'fri'];
  const windows = days.flatMap((day) =>
    (config?.weeklyHours?.[day] ?? []).map((w) => ({
      start: hhmmToMinute(w.open),
      end: hhmmToMinute(w.close) + (w.closesNextDay ? 1440 : 0),
    })),
  );
  if (!windows.length) return null;
  return {
    start: Math.min(...windows.map((w) => w.start)),
    end: Math.max(...windows.map((w) => w.end)),
  };
}
const band = (activity, dayKind, start, end, hourlyRate = '') => ({
  key: key(),
  activity,
  dayKind,
  from: minuteToHhmm(start),
  to: minuteToHhmm(end),
  toNextDay: end > 1440 || end === 1440,
  hourlyRate,
});
const minutesOf = (row) => ({
  start: hhmmToMinute(row.from),
  end: hhmmToMinute(row.to) + (row.toNextDay ? 1440 : 0),
});

/**
 * Hourly prices of a time-booked venue (entertainment plan, Phase 5): per
 * activity, weekday and weekend, in bands such as "6 PM – 1 AM, ₹1,200/hr".
 * Gaps against the opening hours are shown while typing, with the same
 * function the server uses to refuse them. Preview, then confirm.
 */
export function HourlyPricingSection({
  listing,
  hourlyRates = [],
  resources = [],
  activities = [],
}) {
  const { state, pending, preview, form, invalidatePreview } = usePolicyAction(savePricing);
  const formId = useStepFormId();
  const config = listing.bookingConfig?.model === 'hourly' ? listing.bookingConfig : null;
  const offered = activities.filter((a) =>
    resources.some((r) => r.isActive !== false && (r.activities ?? []).includes(a.slug)),
  );
  const [rows, setStoredRows] = useState(() => {
    if (hourlyRates.length)
      return hourlyRates.map((r) =>
        band(r.activity, r.dayKind, r.startMinute, r.endMinute, r.hourlyRate),
      );
    return offered.flatMap((a) =>
      KINDS.flatMap(([kind]) => {
        const span = spanFor(config, kind);
        return span ? [band(a.slug, kind, span.start, span.end)] : [];
      }),
    );
  });
  const setRows = (update) => {
    invalidatePreview();
    setStoredRows(update);
  };
  const e = state.errors ?? {};

  const update = (rowKey, patch) =>
    setRows((list) => list.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)));
  const gaps = useMemo(() => {
    if (!config) return [];
    const out = [];
    for (const activity of offered) {
      const bands = rows
        .filter((r) => r.activity === activity.slug && r.from && r.to)
        .map((r) => ({
          dayKind: r.dayKind,
          startMinute: minutesOf(r).start,
          endMinute: minutesOf(r).end,
          hourlyRateMinor: 1,
        }));
      for (const gap of priceGaps(config, bands)) out.push({ activity: activity.name, ...gap });
    }
    return out;
  }, [config, offered, rows]);

  const peakPreset = (activity) =>
    setRows((list) => [
      ...list.filter((r) => r.activity !== activity),
      ...KINDS.flatMap(([kind]) => {
        const span = spanFor(config, kind);
        if (!span) return [];
        if (span.start >= 1080 || span.end <= 1080)
          return [band(activity, kind, span.start, span.end)];
        const split = 1080;
        return [band(activity, kind, span.start, split), band(activity, kind, split, span.end)];
      }),
    ]);
  const copyWeekday = (activity) =>
    setRows((list) => [
      ...list.filter((r) => !(r.activity === activity && r.dayKind === 'weekend')),
      ...list
        .filter((r) => r.activity === activity && r.dayKind === 'weekday')
        .map((r) => ({ ...r, key: key(), dayKind: 'weekend' })),
    ]);

  const payload = rows
    .filter((r) => r.from && r.to && r.hourlyRate !== '')
    .map(({ activity, dayKind, from, to, toNextDay, hourlyRate }) => ({
      activity,
      dayKind,
      from,
      to,
      toNextDay,
      hourlyRate: Number(hourlyRate),
    }));

  if (!config || !offered.length)
    return (
      <Section
        id="pricing"
        title="Hourly prices"
        intro="Prices are set per activity and per hour."
        state={state}
        pending={pending}
      >
        <p className="rounded-md border-l-4 border-warning bg-warning-bg p-3 text-meta text-warning">
          {!offered.length ? 'Add at least one court first.' : 'Set the opening hours first.'}{' '}
          Prices are checked against them.
        </p>
      </Section>
    );

  return (
    <Section
      id="pricing"
      title="Hourly prices"
      intro="Price per court per hour. Use bands for peak and off-peak. Accepted bookings keep their original price."
      state={state}
      pending={pending}
    >
      <form id={formId} {...form} className="space-y-5">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <input type="hidden" name="rates" value={JSON.stringify(payload)} />

        {offered.map((activity) => (
          <fieldset key={activity.slug} className="rounded-lg border border-border p-4">
            <legend className="inline-flex items-center gap-2 px-1 text-h4">
              <ActivityIcon iconKey={activity.iconKey} className="size-5 text-brand-700" />
              {activity.name}
            </legend>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => peakPreset(activity.slug)}
                className="min-h-11 rounded-full border border-border px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
              >
                Peak from 6 PM
              </button>
              <button
                type="button"
                onClick={() => copyWeekday(activity.slug)}
                className="min-h-11 rounded-full border border-border px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
              >
                Copy Mon–Fri to Sat–Sun
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {KINDS.map(([kind, label]) => {
                const own = rows.filter((r) => r.activity === activity.slug && r.dayKind === kind);
                return (
                  <div key={kind}>
                    <p className="mb-2 text-meta font-semibold text-ink-800">{label}</p>
                    <ul className="space-y-2">
                      {own.map((row) => (
                        <li key={row.key} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            step={1800}
                            aria-label={`${activity.name} ${label} from`}
                            value={row.from}
                            className={cn(inputCls, 'w-32')}
                            onChange={(event) => update(row.key, { from: event.target.value })}
                          />
                          <span aria-hidden="true">–</span>
                          <input
                            type="time"
                            step={1800}
                            aria-label={`${activity.name} ${label} to`}
                            value={row.to}
                            className={cn(inputCls, 'w-32')}
                            onChange={(event) => update(row.key, { to: event.target.value })}
                          />
                          <label className="inline-flex min-h-11 items-center gap-1 text-tiny text-ink-700">
                            <input
                              type="checkbox"
                              checked={row.toNextDay}
                              onChange={(event) =>
                                update(row.key, { toNextDay: event.target.checked })
                              }
                            />
                            next day
                          </label>
                          <span className="inline-flex items-center gap-1">
                            <span aria-hidden="true">₹</span>
                            <Input
                              aria-label={`${activity.name} ${label} ${row.from} rate per hour`}
                              inputMode="numeric"
                              value={row.hourlyRate}
                              onChange={(event) =>
                                update(row.key, {
                                  hourlyRate: event.target.value.replace(/\D/g, ''),
                                })
                              }
                              className="w-24 tabular"
                            />
                            <span className="text-tiny text-ink-500">/hr</span>
                          </span>
                          <button
                            type="button"
                            aria-label="Remove this price"
                            onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                            className="inline-flex size-11 items-center justify-center rounded-full text-ink-600 hover:bg-ink-50"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => {
                        const last = own.at(-1);
                        const start = last
                          ? minutesOf(last).end
                          : (spanFor(config, kind)?.start ?? 360);
                        setRows((list) => [
                          ...list,
                          band(activity.slug, kind, start, Math.min(start + 120, 1800)),
                        ]);
                      }}
                      className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      <Plus className="size-3.5" aria-hidden="true" /> Add a band
                    </button>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}

        {gaps.length ? (
          <div
            role="status"
            className="rounded-md border-l-4 border-warning bg-warning-bg p-3 text-meta text-warning"
          >
            <p className="font-semibold">These open hours have no price yet:</p>
            <ul className="mt-1 list-disc pl-5 text-tiny">
              {gaps.slice(0, 8).map((gap, index) => (
                <li key={index}>
                  {gap.activity} · {DAY_SHORT[gap.day]} {minuteToHhmm(gap.fromMinute)}–
                  {minuteToHhmm(gap.toMinute)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {e.rates ? (
          <ul role="alert" className="list-disc pl-5 text-tiny font-medium text-danger">
            {[].concat(e.rates).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        {preview ? (
          <section
            role="status"
            aria-label="Price change preview"
            className="space-y-2 rounded-md border border-brand-300 bg-brand-50 p-4 text-meta"
          >
            <h3 className="font-semibold">Review before applying</h3>
            <p>{preview.effective}</p>
            <ul className="space-y-0.5 text-tiny">
              {preview.after.map((row, index) => (
                <li key={index} className="tabular">
                  {activities.find((a) => a.slug === row.activity)?.name ?? row.activity} ·{' '}
                  {row.dayKind === 'weekend' ? 'Sat–Sun' : 'Mon–Fri'} · {row.from}–{row.to}
                  {row.toNextDay ? ' (next day)' : ''} · ₹{row.hourlyRate}/hr
                </li>
              ))}
            </ul>
            <p>Nothing has been saved. Submit again to confirm these prices.</p>
          </section>
        ) : null}
        <SaveButton pending={pending} label={preview ? 'Confirm prices' : 'Preview prices'} />
      </form>
    </Section>
  );
}
