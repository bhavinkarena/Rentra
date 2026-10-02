'use client';
import { cn } from 'cn';
import { useActionState, useMemo, useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { saveListingHours } from '@/lib/actions/partner';
import { hourlyBookingConfigSchema } from '@/lib/validation/zod/booking-config';
import { WEEKDAYS } from '@/lib/domain/hourly';
import { useStepFormId } from './chrome';
import { Field, Section, SaveButton, inputCls } from './SectionPrimitives';

const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const DEFAULT_CONFIG = {
  model: 'hourly',
  timeZone: 'Asia/Kolkata',
  leadTimeMinutes: 60,
  bookingHorizonDays: 60,
  stepMinutes: 60,
  minDurationMinutes: 60,
  maxDurationMinutes: 180,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  weeklyHours: Object.fromEntries(
    WEEKDAYS.map((day) => [day, [{ open: '06:00', close: '23:00', closesNextDay: false }]]),
  ),
};
const LEAD_TIMES = [
  [0, 'No minimum'],
  [30, '30 minutes'],
  [60, '1 hour'],
  [120, '2 hours'],
  [240, '4 hours'],
  [1440, '1 day'],
];
const hours = (minutes) => `${minutes / 60} hr`;

/** The stored config minus server bookkeeping, or a sensible venue default. */
function initialConfig(stored) {
  if (stored?.model !== 'hourly') return DEFAULT_CONFIG;
  const { inventoryReady, ...config } = stored;
  return { ...DEFAULT_CONFIG, ...config };
}

/**
 * Opening hours and the booking grid of a time-booked venue (entertainment
 * plan, Phase 5). Saved through the calendar command, so it is previewed first:
 * the preview lists upcoming bookings that would fall outside the new hours.
 * They are kept, never cancelled. The shared schema checks the form before it
 * is sent, so the owner sees the exact problem next to the day.
 */
export function HoursSection({ listing, calendar }) {
  const [state, dispatch, pending] = useActionState(saveListingHours, {});
  const [, startTransition] = useTransition();
  const [config, setConfig] = useState(() => initialConfig(calendar?.listing?.booking_config));
  const [edited, setEdited] = useState(false);
  const preview = edited ? null : state.preview;
  const check = useMemo(() => hourlyBookingConfigSchema.safeParse(config), [config]);
  const issues = check.success ? [] : check.error.issues;
  const issueFor = (path) =>
    issues.find((issue) => path.every((part, index) => issue.path[index] === part))?.message;
  const stepSeconds = config.stepMinutes * 60;
  const durations = [];
  for (let m = config.stepMinutes; m <= 720; m += config.stepMinutes) durations.push(m);

  const change = (patch) => {
    setEdited(true);
    setConfig((current) => ({ ...current, ...patch }));
  };
  const setDay = (day, windows) =>
    change({ weeklyHours: { ...config.weeklyHours, [day]: windows } });

  const submit = (event) => {
    event.preventDefault();
    if (!check.success) return;
    const data = new FormData(event.currentTarget);
    data.set('mode', preview ? 'apply' : 'preview');
    if (preview) data.set('previewToken', preview.token);
    setEdited(false);
    startTransition(() => dispatch(data));
  };
  const outside = preview?.result?.outsideHours ?? [];

  return (
    <Section
      id="hours"
      title="Opening hours"
      intro="When players can book, and how long a booking can be. Changing hours never cancels a booking."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} onSubmit={submit} className="space-y-5">
        <input type="hidden" name="rentableId" value={listing.id} />
        <input type="hidden" name="model" value="hourly" />
        <input type="hidden" name="configuration" value={JSON.stringify(config)} />
        <input
          type="hidden"
          name="expectedVersion"
          value={calendar?.listing?.booking_config_version ?? listing.bookingConfigVersion ?? 0}
        />
        <input
          type="hidden"
          name="expectedCalendarVersion"
          value={calendar?.listing?.calendar_version ?? ''}
        />

        <fieldset className="space-y-2">
          <legend className="mb-2 text-meta font-semibold text-ink-800">Weekly hours</legend>
          {WEEKDAYS.map((day) => {
            const windows = config.weeklyHours[day] ?? [];
            const open = windows.length > 0;
            const dayIssue = issueFor(['weeklyHours', day]);
            return (
              <div key={day} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <label className="inline-flex min-h-11 w-36 items-center gap-2 text-meta font-semibold">
                    <input
                      type="checkbox"
                      checked={open}
                      onChange={(event) =>
                        setDay(
                          day,
                          event.target.checked
                            ? [{ open: '06:00', close: '23:00', closesNextDay: false }]
                            : [],
                        )
                      }
                    />
                    {DAY_LABELS[day]}
                  </label>
                  {!open ? <span className="text-meta text-ink-500">Closed</span> : null}
                  {windows.map((window, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        step={stepSeconds}
                        aria-label={`${DAY_LABELS[day]} opens`}
                        value={window.open}
                        className={cn(inputCls, 'w-32')}
                        onChange={(event) =>
                          setDay(
                            day,
                            windows.map((w, i) =>
                              i === index ? { ...w, open: event.target.value } : w,
                            ),
                          )
                        }
                      />
                      <span aria-hidden="true">–</span>
                      <input
                        type="time"
                        step={stepSeconds}
                        aria-label={`${DAY_LABELS[day]} closes`}
                        value={window.close}
                        className={cn(inputCls, 'w-32')}
                        onChange={(event) =>
                          setDay(
                            day,
                            windows.map((w, i) =>
                              i === index ? { ...w, close: event.target.value } : w,
                            ),
                          )
                        }
                      />
                      <label className="inline-flex min-h-11 items-center gap-1.5 text-tiny text-ink-700">
                        <input
                          type="checkbox"
                          checked={window.closesNextDay}
                          onChange={(event) =>
                            setDay(
                              day,
                              windows.map((w, i) =>
                                i === index ? { ...w, closesNextDay: event.target.checked } : w,
                              ),
                            )
                          }
                        />
                        next day
                      </label>
                      {windows.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove ${DAY_LABELS[day]} shift ${index + 1}`}
                          onClick={() =>
                            setDay(
                              day,
                              windows.filter((_, i) => i !== index),
                            )
                          }
                          className="inline-flex size-11 items-center justify-center rounded-full text-ink-600 hover:bg-ink-50"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {open && windows.length < 2 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDay(day, [
                          ...windows,
                          { open: '17:00', close: '22:00', closesNextDay: false },
                        ])
                      }
                      className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      <Plus className="size-3.5" aria-hidden="true" /> Second shift
                    </button>
                  ) : null}
                </div>
                {dayIssue ? (
                  <p className="mt-1 text-tiny font-medium text-danger">{dayIssue}</p>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              change({
                weeklyHours: Object.fromEntries(
                  WEEKDAYS.map((day) => [day, config.weeklyHours.mon ?? []]),
                ),
              })
            }
            className="min-h-11 rounded-full px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
          >
            Copy Monday to every day
          </button>
          {issueFor(['weeklyHours']) && !WEEKDAYS.some((d) => issueFor(['weeklyHours', d])) ? (
            <p className="text-tiny font-medium text-danger">{issueFor(['weeklyHours'])}</p>
          ) : null}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-meta font-semibold text-ink-800">Booking grid</legend>
          <Field id="stepMinutes" label="Start times every" hint="How often a booking can start.">
            <select
              id="stepMinutes"
              className={inputCls}
              value={config.stepMinutes}
              onChange={(event) => change({ stepMinutes: Number(event.target.value) })}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </Field>
          <Field
            id="minDurationMinutes"
            label="Shortest booking"
            error={issueFor(['minDurationMinutes'])}
          >
            <select
              id="minDurationMinutes"
              className={inputCls}
              value={config.minDurationMinutes}
              onChange={(event) => change({ minDurationMinutes: Number(event.target.value) })}
            >
              {durations.map((m) => (
                <option key={m} value={m}>
                  {hours(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="maxDurationMinutes"
            label="Longest booking"
            error={issueFor(['maxDurationMinutes'])}
          >
            <select
              id="maxDurationMinutes"
              className={inputCls}
              value={config.maxDurationMinutes}
              onChange={(event) => change({ maxDurationMinutes: Number(event.target.value) })}
            >
              {durations.map((m) => (
                <option key={m} value={m}>
                  {hours(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="bufferAfterMinutes"
            label="Changeover after each booking"
            hint={
              config.bufferAfterMinutes % config.stepMinutes
                ? `Not a multiple of ${config.stepMinutes} minutes: the next start waits for the following slot.`
                : 'Minutes kept free for cleaning or handover.'
            }
          >
            <select
              id="bufferAfterMinutes"
              className={inputCls}
              value={config.bufferAfterMinutes}
              onChange={(event) => change({ bufferAfterMinutes: Number(event.target.value) })}
            >
              {[0, 10, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m ? `${m} minutes` : 'None'}
                </option>
              ))}
            </select>
          </Field>
          <Field id="leadTimeMinutes" label="Book at least">
            <select
              id="leadTimeMinutes"
              className={inputCls}
              value={config.leadTimeMinutes}
              onChange={(event) => change({ leadTimeMinutes: Number(event.target.value) })}
            >
              {LEAD_TIMES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ahead
                </option>
              ))}
            </select>
          </Field>
          <Field id="bookingHorizonDays" label="Bookable up to" hint="Days ahead, 1–180.">
            <input
              id="bookingHorizonDays"
              type="number"
              min={1}
              max={180}
              inputMode="numeric"
              className={`${inputCls} tabular`}
              value={config.bookingHorizonDays}
              onChange={(event) => change({ bookingHorizonDays: Number(event.target.value) })}
            />
          </Field>
        </fieldset>

        {preview ? (
          <section
            role="status"
            aria-label="Opening hours preview"
            className="space-y-2 rounded-md border border-brand-300 bg-brand-50 p-4 text-meta"
          >
            <h3 className="font-semibold">Review before applying</h3>
            {outside.length ? (
              <>
                <p>
                  {outside.length} upcoming booking{outside.length === 1 ? '' : 's'} fall outside
                  the new hours. They stay booked; contact the players if you will not open for
                  them.
                </p>
                <ul className="list-disc pl-5">
                  {outside.map((row) => (
                    <li key={row.reference}>
                      {row.reference} ·{' '}
                      {new Date(row.startsAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No upcoming booking is affected.</p>
            )}
            <p>Nothing has been saved. Submit again to confirm these hours.</p>
          </section>
        ) : null}
        {!check.success ? (
          <p className="text-tiny text-danger">Fix the highlighted hours before saving.</p>
        ) : null}
        <SaveButton pending={pending} label={preview ? 'Confirm hours' : 'Preview hours'} />
      </form>
    </Section>
  );
}
