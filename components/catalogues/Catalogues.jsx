'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import { catalogueCommand } from '@/lib/actions/catalogues';
const names = {
  cities: 'Cities',
  areas: 'Areas',
  categories: 'Categories',
  amenities: 'Amenities',
};
const fieldNames = {
  label: 'Label',
  sortOrder: 'Display order',
  isActive: 'Active',
  slug: 'Permanent slug',
  state: 'State',
  cityId: 'City',
  centre: 'Approximate centre',
  form: 'Form',
  rentalUnit: 'Rental unit',
  labelHi: 'Hindi label',
  labelGu: 'Gujarati label',
  groupSlug: 'Group',
  isFilterable: 'Search filter',
  valueType: 'Value type',
};
const inputClass = `${sharedFieldClass} mt-1`;
const buttonClass = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
function Nav() {
  return (
    <nav aria-label="Catalogue types" className="flex flex-wrap gap-4">
      {Object.entries(names).map(([type, name]) => (
        <Link key={type} className="underline" href={`/admin/catalogues/${type}`}>
          {name}
        </Link>
      ))}
    </nav>
  );
}
export function CatalogueList({ data }) {
  return (
    <section className="space-y-6 p-4 sm:p-6">
      <Nav />
      <h1 className="text-2xl font-bold">{names[data.type]}</h1>
      <p>
        Manage reference labels, ordering and availability. Open a record to review its listing
        usage.
      </p>
      <form className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1">
          Search label or slug
          <input className={inputClass} name="q" defaultValue={data.query.q} maxLength={100} />
        </label>
        <label>
          Status
          <select
            className={inputClass}
            aria-label="Status"
            name="status"
            defaultValue={data.query.status}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button className={buttonClass}>Search</button>
      </form>
      {data.canWrite && (
        <Link className="inline-block underline" href={`/admin/catalogues/${data.type}/new`}>
          Add record
        </Link>
      )}
      <p>{data.total} records</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{names[data.type]} catalogue</caption>
          <thead>
            <tr>
              {['Label', 'Slug', 'Status', 'Order', 'Listing usage'].map((h) => (
                <th scope="col" className="p-3" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} className="border-t border-ink-200">
                <td className="p-3">
                  <Link className="underline" href={`/admin/catalogues/${data.type}/${r.id}`}>
                    {r.name || r.label_en}
                  </Link>
                </td>
                <td className="p-3">{r.slug}</td>
                <td className="p-3">{r.is_active ? 'Active' : 'Inactive'}</td>
                <td className="p-3">{r.sort_order}</td>
                <td className="p-3">{r.usageCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.items.length && <p>No matching records. Try another label or status.</p>}
      <nav aria-label="Catalogue pages" className="flex gap-4">
        {data.page > 1 && (
          <Link href={`?${new URLSearchParams({ ...data.query, page: data.page - 1 })}`}>
            Previous
          </Link>
        )}
        <span>
          Page {data.page} of {data.totalPages}
        </span>
        {data.page < data.totalPages && (
          <Link href={`?${new URLSearchParams({ ...data.query, page: data.page + 1 })}`}>Next</Link>
        )}
      </nav>
    </section>
  );
}
function Impact({ data }) {
  return (
    <div className="space-y-3">
      <p>
        {data.count} referenced listings · {data.liveCount} live · {data.children.length} child
        areas · {data.redirects?.length ?? 0} incoming redirects
      </p>
      <details>
        <summary className="cursor-pointer underline">Affected listings and discovery URLs</summary>
        <ul className="space-y-2 py-3">
          {data.listings.map((r) => (
            <li key={r.id}>
              <Link className="underline" href={`/admin/properties/${r.id}`}>
                {r.title}
              </Link>{' '}
              — {r.status}
              {r.value != null ? ` · value: ${r.value}` : ''}
            </li>
          ))}
        </ul>
        {data.paths.map((p) => (
          <p key={p} className="break-all">
            {p}
          </p>
        ))}
        {data.redirects?.map((r) => (
          <p key={r.from_path} className="break-all">
            Redirect: {r.from_path} → {r.to_path}
          </p>
        ))}
        {!data.count && <p>No listing references.</p>}
        {data.children.map((a) => (
          <p key={a.id}>Child area: {a.name}</p>
        ))}
      </details>
    </div>
  );
}
export function CatalogueDetail({ data }) {
  const { type, record: r, canWrite } = data,
    creating = !r,
    router = useRouter();
  const [result, setResult] = useState(null),
    [pending, startTransition] = useTransition();
  const [proposal, setProposal] = useState(null);
  const invalidate = () => {
    setResult(null);
    setProposal(null);
  };
  const submit = (event) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget),
      command = event.nativeEvent.submitter?.value || 'save';
    const fields = {
      label: String(f.get('label')),
      sortOrder: Number(f.get('sortOrder')),
      isActive: f.get('isActive') === 'on',
    };
    if (creating) fields.slug = String(f.get('slug'));
    if (type === 'cities') fields.state = String(f.get('state'));
    if (type === 'areas') {
      if (creating) fields.cityId = String(f.get('cityId'));
      if (
        f.get('editCentre') === 'on' &&
        (!String(f.get('latitude')).trim() || !String(f.get('longitude')).trim())
      ) {
        setResult({ error: 'Enter both latitude and longitude for the approximate centre.' });
        return;
      }
      if (f.get('editCentre') === 'on')
        fields.centre = {
          latitude: Number(f.get('latitude')),
          longitude: Number(f.get('longitude')),
          approved: f.get('approved') === 'on',
        };
    }
    if (type === 'categories' && creating)
      Object.assign(fields, {
        form: String(f.get('form')),
        rentalUnit: String(f.get('rentalUnit')),
      });
    if (type === 'amenities')
      Object.assign(fields, {
        labelHi: String(f.get('labelHi')),
        labelGu: String(f.get('labelGu')),
        groupSlug: String(f.get('groupSlug')),
        isFilterable: f.get('isFilterable') === 'on',
        ...(creating ? { valueType: String(f.get('valueType')) } : {}),
      });
    const input = {
      command,
      version: r?.version || 0,
      reason: String(f.get('reason')),
      preview: true,
      ...(command === 'replace' ? { replacementId: String(f.get('replacementId')) } : { fields }),
    };
    setProposal(input);
    startTransition(async () => setResult(await catalogueCommand(type, r?.id || 'new', input)));
  };
  const confirm = () =>
    startTransition(async () => {
      const saved = await catalogueCommand(type, r?.id || 'new', {
        ...proposal,
        preview: false,
        previewHash: result.previewHash,
      });
      setResult(saved);
      setProposal(null);
      if (saved.ok) {
        if (creating) router.replace(`/admin/catalogues/${type}/${saved.id}`);
        router.refresh();
      }
    });
  const field = (label, name, value, props = {}) => (
    <label className="block">
      {label}
      <input name={name} className={inputClass} defaultValue={value ?? ''} {...props} />
    </label>
  );
  return (
    <section className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Nav />
      <h1 className="text-2xl font-bold">
        {creating ? `Add ${type} record` : r.name || r.label_en}
      </h1>
      {r && (
        <>
          <p>
            Slug: {r.slug} · Revision {r.version} · {r.is_active ? 'Active' : 'Inactive'}
          </p>
          <Impact data={data.impact} />
          <p>
            Slugs, city membership, rental semantics and amenity value types are protected. Changes
            to references or types require an explicit migration.
          </p>
          {type === 'amenities' && <p>Value type: {r.value_type}</p>}
          {type === 'categories' && (
            <p>
              Form: {r.form} · Rental unit: {r.default_rental_unit}
            </p>
          )}
          {type === 'areas' && (
            <p>City: {data.cities.find((c) => c.id === r.city_id)?.name || r.city_id}</p>
          )}
        </>
      )}
      {!canWrite ? (
        <div className="space-y-3">
          <p>You have read-only catalogue access.</p>
          {r && (
            <dl className="space-y-2">
              {Object.entries({
                'Display order': r.sort_order,
                State: r.state,
                'Hindi label': r.label_hi,
                'Gujarati label': r.label_gu,
                Group: r.group_slug,
                'Search filter': r.is_filterable == null ? null : r.is_filterable ? 'Yes' : 'No',
                'Approximate centre': r.centre
                  ? `${r.centre.latitude}, ${r.centre.longitude}`
                  : null,
              })
                .filter(([, value]) => value != null)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-semibold">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      ) : (
        <form key={r?.version || 0} onSubmit={submit} onChange={invalidate} className="space-y-5">
          <fieldset disabled={pending} className="space-y-5">
            <legend className="font-semibold">Record details</legend>
            {field('Label', 'label', r?.name || r?.label_en, {
              required: true,
              maxLength: type === 'amenities' ? 80 : 120,
              minLength: 2,
            })}
            {creating &&
              field('Permanent slug', 'slug', '', {
                required: true,
                maxLength: type === 'amenities' ? 60 : 80,
                pattern: type === 'amenities' ? '[a-z0-9]+(_[a-z0-9]+)*' : '[a-z0-9]+(-[a-z0-9]+)*',
              })}
            {field('Display order', 'sortOrder', r?.sort_order ?? 0, {
              type: 'number',
              min: 0,
              max: 10000,
              required: true,
            })}
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isActive" defaultChecked={r?.is_active ?? true} />
              Active
            </label>
            {type === 'cities' &&
              field('State', 'state', r?.state, { required: true, minLength: 2, maxLength: 80 })}
            {type === 'areas' && (
              <>
                {creating && (
                  <label className="block">
                    City
                    <select required aria-label="City" name="cityId" className={inputClass}>
                      {data.cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <fieldset className="space-y-3 rounded-md border border-ink-200 p-4">
                  <legend>Approximate locality map centre</legend>
                  <p>
                    Use an approved public locality centre. Never enter a property’s private arrival
                    coordinates.
                  </p>
                  <label className="flex gap-2">
                    <input type="checkbox" name="editCentre" />
                    Update approximate centre
                  </label>
                  {field('Latitude', 'latitude', r?.centre?.latitude, {
                    type: 'number',
                    step: 'any',
                    min: -90,
                    max: 90,
                  })}
                  {field('Longitude', 'longitude', r?.centre?.longitude, {
                    type: 'number',
                    step: 'any',
                    min: -180,
                    max: 180,
                  })}
                  <label className="flex gap-2">
                    <input type="checkbox" name="approved" />
                    This is an approved approximate locality centre
                  </label>
                </fieldset>
              </>
            )}
            {type === 'categories' && creating && (
              <>
                <label className="block">
                  Form
                  <select aria-label="Form" name="form" className={inputClass}>
                    <option>fixed</option>
                    <option>movable</option>
                  </select>
                </label>
                <label className="block">
                  Rental unit
                  <select aria-label="Rental unit" name="rentalUnit" className={inputClass}>
                    {['slot', 'night', 'day', 'week', 'month'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {type === 'amenities' && (
              <>
                {field('Hindi label', 'labelHi', r?.label_hi, { maxLength: 120 })}
                {field('Gujarati label', 'labelGu', r?.label_gu, { maxLength: 120 })}
                {field('Group', 'groupSlug', r?.group_slug || 'general', {
                  required: true,
                  pattern: '[a-z0-9_]+',
                  maxLength: 40,
                })}
                <label className="flex gap-2">
                  <input type="checkbox" name="isFilterable" defaultChecked={r?.is_filterable} />
                  Available as a search filter
                </label>
                {creating && (
                  <label className="block">
                    Value type
                    <select aria-label="Value type" name="valueType" className={inputClass}>
                      {['none', 'count', 'dimensions', 'area', 'charge'].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            {field('Reason for change', 'reason', '', {
              required: true,
              minLength: 10,
              maxLength: 1000,
            })}
            <button className={buttonClass} name="command" value="save">
              Preview changes
            </button>
            {!creating && (
              <fieldset className="space-y-3 rounded-md border border-ink-200 p-4">
                <legend>Replacement planning</legend>
                <p>Preview affected references for a separately reviewed migration.</p>
                <label className="block">
                  Replacement
                  <select className={inputClass} aria-label="Replacement" name="replacementId">
                    <option value="">Choose an active record</option>
                    {data.replacements.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={buttonClass} name="command" value="replace">
                  Preview replacement
                </button>
              </fieldset>
            )}
          </fieldset>
        </form>
      )}
      {pending && <p role="status">Checking catalogue…</p>}
      {result?.error && (
        <p role="alert" className="rounded-md border border-danger/30 p-4">
          {result.error}
        </p>
      )}
      {['STALE_CATALOGUE', 'STALE_PREVIEW'].includes(result?.code) && (
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            router.refresh();
            invalidate();
          }}
        >
          Reload latest record
        </button>
      )}
      {result?.ok && <p role="status">Catalogue record saved.</p>}
      {result?.preview && (
        <section
          aria-label="Change preview"
          className="space-y-4 rounded-md border-2 border-ink-900 p-4"
        >
          <h2 className="text-xl font-bold">Review impact</h2>
          <p>{result.notice}</p>
          {result.fields && (
            <dl className="space-y-1">
              {Object.entries(result.fields).map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-2">
                  <dt className="font-semibold">{fieldNames[k] || k}:</dt>
                  <dd className="break-all">
                    {typeof v === 'object'
                      ? `${v.latitude}, ${v.longitude} (approved)`
                      : typeof v === 'boolean'
                        ? v
                          ? 'Yes'
                          : 'No'
                        : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {result.replacement && (
            <p>
              Proposed replacement: {result.replacement.name || result.replacement.label_en} ·{' '}
              {result.replacement.impact?.count ?? 0} existing references ·{' '}
              {result.replacement.overlapCount ?? 0} overlapping listings
            </p>
          )}
          <Impact data={result.impact} />
          {result.blocked ? (
            <p role="status">{result.blocked}</p>
          ) : (
            <button disabled={pending || !proposal} onClick={confirm} className={buttonClass}>
              Confirm and save
            </button>
          )}
        </section>
      )}
    </section>
  );
}
