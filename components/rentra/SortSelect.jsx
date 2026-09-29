'use client';

/**
 * Sort joins the filters form by id and submits it on change, so filters and
 * sort always travel together. The server renders an Apply button in
 * <noscript> for browsers without JavaScript.
 */
export default function SortSelect({ value, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-meta font-medium text-ink-700">
      Sort
      <select
        form="discovery-filters"
        aria-label="Sort"
        name="sort"
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="min-h-10 rounded-full border border-border bg-card px-4 text-base text-ink-900 lg:text-meta"
      >
        {Object.entries(options).map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
