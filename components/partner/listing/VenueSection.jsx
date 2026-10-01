'use client';
import { useActionState, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { saveVenue } from '@/lib/actions/partner';
import { ActivityIcon } from '@/components/rentra/icons/activity-icons';
import { useStepFormId } from './chrome';
import { VersionField, Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';

const SURFACES = [
  'Artificial turf',
  'Natural grass',
  'Wooden',
  'Synthetic',
  'Concrete',
  'Clay',
  'Other',
];
const MAX_COURTS = 30;

const blank = (activity, index) => ({
  key: `new-${Date.now()}-${index}`,
  name: `Court ${index + 1}`,
  capacity: 10,
  isIndoor: null,
  details: {},
  activities: activity ? [activity] : [],
  isActive: true,
});

/** The editor's row from the API row (keeps the id; `key` is only for React). */
const fromApi = (row) => ({
  key: row.id,
  id: row.id,
  name: row.name,
  capacity: row.capacity,
  isIndoor: row.isIndoor ?? null,
  details: row.details ?? {},
  activities: row.activities ?? [],
  isActive: row.isActive !== false,
});

/**
 * Courts, lanes, turfs or stations of a time-booked venue (entertainment plan,
 * Phase 5). Each court lists the activities it can be booked for, so one
 * multi-sport turf is one court with two activities and can never be sold
 * twice. Removing a saved court deactivates it; the API refuses while it has
 * upcoming bookings.
 */
export function VenueSection({ listing, resources = [], activities = [] }) {
  const [state, action, pending] = useActionState(saveVenue, {});
  const primary = activities.find((a) => a.id === listing.categoryId)?.slug;
  const [courts, setCourts] = useState(() =>
    resources.length ? resources.map(fromApi) : [blank(primary, 0)],
  );
  const e = state.errors ?? {};
  const active = courts.filter((c) => c.isActive);
  const removed = courts.filter((c) => !c.isActive);

  const update = (key, patch) =>
    setCourts((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const move = (key, delta) =>
    setCourts((rows) => {
      const list = rows.filter((r) => r.isActive);
      const index = list.findIndex((r) => r.key === key);
      const target = index + delta;
      if (target < 0 || target >= list.length) return rows;
      [list[index], list[target]] = [list[target], list[index]];
      return [...list, ...rows.filter((r) => !r.isActive)];
    });
  const remove = (court) =>
    setCourts((rows) =>
      court.id
        ? rows.map((r) => (r.key === court.key ? { ...r, isActive: false } : r))
        : rows.filter((r) => r.key !== court.key),
    );
  const toggleActivity = (court, slug) =>
    update(court.key, {
      activities: court.activities.includes(slug)
        ? court.activities.filter((s) => s !== slug)
        : [...court.activities, slug],
    });

  // Sort order follows the list; inactive courts keep their place at the end.
  const payload = [...active, ...removed].map((c, index) => ({
    ...(c.id ? { id: c.id } : {}),
    name: c.name.trim(),
    capacity: Number(c.capacity) || 0,
    isIndoor: c.isIndoor,
    details: Object.fromEntries(Object.entries(c.details).filter(([, v]) => v)),
    activities: c.activities,
    sortOrder: (index + 1) * 10,
    isActive: c.isActive,
  }));

  return (
    <Section
      id="venue"
      title="Courts"
      intro="Add each court, lane, turf or station guests can book on its own. Say which activities each one is for."
      state={state}
      pending={pending}
    >
      <form id={useStepFormId()} action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state]} />
        <input type="hidden" name="resources" value={JSON.stringify(payload)} />
        {e.resources ? (
          <p role="alert" className="text-tiny font-medium text-danger">
            {[].concat(e.resources).join(' ')}
          </p>
        ) : null}

        <ol className="space-y-3">
          {active.map((court, index) => (
            <li key={court.key} className="rounded-lg border border-border bg-card p-4">
              <fieldset className="space-y-4">
                <legend className="sr-only">Court {index + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <Field id={`court-${court.key}-name`} label="Name">
                    <Input
                      id={`court-${court.key}-name`}
                      value={court.name}
                      maxLength={60}
                      required
                      onChange={(event) => update(court.key, { name: event.target.value })}
                    />
                  </Field>
                  <Field id={`court-${court.key}-capacity`} label="Max players">
                    <Input
                      id={`court-${court.key}-capacity`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={500}
                      value={court.capacity}
                      className="tabular"
                      onChange={(event) => update(court.key, { capacity: event.target.value })}
                    />
                  </Field>
                </div>

                <div
                  role="group"
                  aria-label={`Activities on ${court.name || `court ${index + 1}`}`}
                >
                  <p className="mb-1.5 text-meta font-semibold text-ink-800">Can be booked for</p>
                  <Field id={`court-${court.key}-format`} label="Playing format" hint="Optional, e.g. 6-a-side">
                  <Input id={`court-${court.key}-format`} value={court.details.format ?? ''} maxLength={40}
                    onChange={(event) => update(court.key, { details: { ...court.details, format: event.target.value } })} />
                </Field>

                <div className="flex flex-wrap gap-2">
                    {activities.map((activity) => {
                      const checked = court.activities.includes(activity.slug);
                      return (
                        <label
                          key={activity.slug}
                          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-meta has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                            checked
                              ? 'border-brand-600 bg-brand-50 text-brand-800'
                              : 'border-border text-ink-700 hover:border-brand-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleActivity(court, activity.slug)}
                          />
                          <ActivityIcon iconKey={activity.iconKey} className="size-4" />
                          {activity.name}
                        </label>
                      );
                    })}
                  </div>
                  {!court.activities.length ? (
                    <p className="mt-1.5 text-tiny font-medium text-danger">
                      Choose at least one activity.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`court-${court.key}-indoor`} label="Indoor or outdoor">
                    <select
                      id={`court-${court.key}-indoor`}
                      className={inputCls}
                      value={court.isIndoor == null ? '' : String(court.isIndoor)}
                      onChange={(event) =>
                        update(court.key, {
                          isIndoor:
                            event.target.value === '' ? null : event.target.value === 'true',
                        })
                      }
                    >
                      <option value="">Not stated</option>
                      <option value="true">Indoor</option>
                      <option value="false">Outdoor</option>
                    </select>
                  </Field>
                  <Field id={`court-${court.key}-surface`} label="Surface">
                    <select
                      id={`court-${court.key}-surface`}
                      className={inputCls}
                      value={court.details.surface ?? ''}
                      onChange={(event) =>
                        update(court.key, {
                          details: { ...court.details, surface: event.target.value },
                        })
                      }
                    >
                      <option value="">Not stated</option>
                      {SURFACES.map((surface) => (
                        <option key={surface}>{surface}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    id={`court-${court.key}-size`}
                    label="Size"
                    hint="Optional, e.g. 40 × 80 ft"
                  >
                    <Input
                      id={`court-${court.key}-size`}
                      value={court.details.size ?? ''}
                      maxLength={40}
                      onChange={(event) =>
                        update(court.key, {
                          details: { ...court.details, size: event.target.value },
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-2">
                  <IconButton
                    label="Move up"
                    disabled={index === 0}
                    onClick={() => move(court.key, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === active.length - 1}
                    onClick={() => move(court.key, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Duplicate"
                    disabled={courts.length >= MAX_COURTS}
                    onClick={() =>
                      setCourts((rows) => [
                        ...rows,
                        {
                          ...court,
                          key: `copy-${Date.now()}`,
                          id: undefined,
                          name: `${court.name} copy`,
                        },
                      ])
                    }
                  >
                    <Copy className="size-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Remove"
                    disabled={active.length === 1}
                    onClick={() => remove(court)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        <button
          type="button"
          disabled={courts.length >= MAX_COURTS}
          onClick={() => setCourts((rows) => [...rows, blank(primary, active.length)])}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-meta font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" /> Add a court
        </button>

        {removed.length ? (
          <details className="rounded-md border border-border p-3 text-meta">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Removed courts ({removed.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {removed.map((court) => (
                <li key={court.key} className="flex items-center justify-between gap-3">
                  <span>{court.name}</span>
                  <button
                    type="button"
                    onClick={() => update(court.key, { isActive: true })}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Restore
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-tiny text-ink-500">
              Removed courts stay on past bookings. A court with upcoming bookings cannot be
              removed.
            </p>
          </details>
        ) : null}

        <SaveButton pending={pending} label="Save courts" />
      </form>
    </Section>
  );
}

function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full border border-border text-ink-700 hover:bg-ink-50 disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}
