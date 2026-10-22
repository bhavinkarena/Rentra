'use client';
import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import {
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminEmpty,
  AdminReadOnly,
} from '@/components/admin/AdminPrimitives';
import { catalogueCommand, betaInviteCommand } from '@/lib/actions/catalogues';
import { ActivityIcon } from '@/components/rentra/icons/activity-icons';
import { VerticalIcon } from '@/components/rentra/icons/vertical-icons';
import {
  Briefcase,
  FerrisWheel,
  GraduationCap,
  Hospital,
  Landmark,
  MapPin,
  Plane,
  ShoppingBag,
  TrainFront,
} from 'lucide-react';
const names = {
  verticals: 'Verticals',
  cities: 'Cities',
  areas: 'Areas',
  categories: 'Categories',
  amenities: 'Amenities',
  landmarks: 'Landmarks',
  beta: 'Hotel beta',
};
/** Icon keys the frontend ships (components/rentra/icons). */
const ICON_KEYS = [
  'farmhouse',
  'cricket',
  'pickleball',
  'badminton',
  'bowling',
  'football',
  'gaming',
  'trampoline',
  'kart',
];
/** V1 booking model per vertical, as the API enforces it. */
const UNIT_FOR = { farmhouse: 'slot', entertainment: 'hour' };
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
  verticalCode: 'Vertical',
  iconKey: 'Icon',
  verticals: 'Verticals',
};
const inputClass = `${sharedFieldClass} mt-1`;
const buttonClass = `${sharedButtonVariants({ shape: 'default', size: 'default' })} `;
function Nav({ type: current }) {
  return (
    <nav aria-label="Catalogue types" className="flex flex-wrap gap-4">
      {Object.entries(names).map(([type, name]) => (
        <Link
          key={type}
          className="inline-flex min-h-11 items-center underline"
          aria-current={current === type ? 'page' : undefined}
          href={`/admin/catalogues/${type}`}
        >
          {name}
        </Link>
      ))}
    </nav>
  );
}
export function CatalogueList({ data }) {
  return (
    <AdminPage className="space-y-6">
      <Nav type={data.type} />
      <AdminPageHeader title={names[data.type]} />
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
        <Link
          className="inline-flex min-h-11 items-center underline"
          href={`/admin/catalogues/${data.type}/new`}
        >
          Add record
        </Link>
      )}
      <p>{data.total} records</p>
      <AdminTable
        label={`${names[data.type]} catalogue`}
        columns={['Label', 'Slug', 'Status', 'Order', 'Property usage']}
        empty={
          !data.items.length && (
            <AdminEmpty title="No matching records" description="Choose another label or status." />
          )
        }
      >
        {data.items.map((record) => (
          <tr key={record.id}>
            <td className="px-4 py-4">
              <Link
                className="inline-flex min-h-11 items-center underline"
                href={`/admin/catalogues/${data.type}/${record.id}`}
              >
                {record.name || record.label_en}
              </Link>
            </td>
            <td className="max-w-xs break-all px-4 py-4">{record.slug}</td>
            <td className="px-4 py-4">{record.is_active ? 'Active' : 'Inactive'}</td>
            <td className="px-4 py-4">{record.sort_order}</td>
            <td className="px-4 py-4">{record.usageCount}</td>
          </tr>
        ))}
      </AdminTable>
      <Pagination
        page={data.page}
        pageSize={25}
        total={data.total}
        pages={data.totalPages}
        pageSizes={null}
        label="Catalogue pages"
        noun="records"
      />
    </AdminPage>
  );
}
function Impact({ data, canReadProperties = false }) {
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
              {canReadProperties ? (
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href={`/admin/properties/${r.id}`}
                >
                  {r.title}
                </Link>
              ) : (
                <span>{r.title}</span>
              )}{' '}
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
export function CatalogueDetail({ data, canReadProperties = false }) {
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
        verticalCode: String(f.get('verticalCode')),
      });
    if (type === 'categories') fields.iconKey = String(f.get('iconKey')) || null;
    if (type === 'amenities')
      Object.assign(fields, {
        labelHi: String(f.get('labelHi')),
        labelGu: String(f.get('labelGu')),
        groupSlug: String(f.get('groupSlug')),
        isFilterable: f.get('isFilterable') === 'on',
        verticals: f.getAll('verticals').map(String),
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
    <AdminPage width="max-w-4xl" className="space-y-6">
      <Nav type={data.type} />
      <AdminPageHeader
        title={creating ? `Add ${type} record` : r.name || r.label_en}
        backHref={`/admin/catalogues/${type}`}
        backLabel={names[type]}
      />
      {r && (
        <>
          <p>
            Slug: {r.slug} · Revision {r.version} · {r.is_active ? 'Active' : 'Inactive'}
          </p>
          <Impact data={data.impact} canReadProperties={canReadProperties} />
          <p>
            Slugs, city membership, rental semantics and amenity value types are protected. Changes
            to references or types require an explicit migration.
          </p>
          {type === 'amenities' && <p>Value type: {r.value_type}</p>}
          {type === 'categories' && (
            <p>
              Vertical: {r.vertical_code} · Form: {r.form} · Rental unit: {r.default_rental_unit}
            </p>
          )}
          {type === 'amenities' && <p>Verticals: {(r.verticals ?? []).join(', ') || 'none'}</p>}
          {type === 'areas' && (
            <p>City: {data.cities.find((c) => c.id === r.city_id)?.name || r.city_id}</p>
          )}
        </>
      )}
      {!canWrite ? (
        <div className="space-y-3">
          <AdminReadOnly />
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
            {type === 'categories' && <IconKeyField defaultValue={r?.icon_key ?? ''} />}
            {type === 'categories' && creating && (
              <>
                <label className="block">
                  Vertical
                  <select
                    aria-label="Vertical"
                    name="verticalCode"
                    className={inputClass}
                    defaultValue="farmhouse"
                    onChange={(event) => {
                      const unit = event.currentTarget.form?.elements.namedItem('rentalUnit');
                      if (unit && UNIT_FOR[event.target.value])
                        unit.value = UNIT_FOR[event.target.value];
                    }}
                  >
                    {(data.verticals ?? [{ code: 'farmhouse', name: 'Farmhouse' }]).map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                    {['slot', 'hour', 'night', 'day', 'week', 'month'].map((v) => (
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
                <fieldset className="space-y-2">
                  <legend>Offered for</legend>
                  {(data.verticals ?? []).map((v) => (
                    <label key={v.code} className="flex gap-2">
                      <input
                        type="checkbox"
                        name="verticals"
                        value={v.code}
                        defaultChecked={(r?.verticals ?? ['farmhouse']).includes(v.code)}
                      />
                      {v.name}
                    </label>
                  ))}
                </fieldset>
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
          <Impact data={result.impact} canReadProperties={canReadProperties} />
          {result.blocked ? (
            <p role="status">{result.blocked}</p>
          ) : (
            <button disabled={pending || !proposal} onClick={confirm} className={buttonClass}>
              Confirm and save
            </button>
          )}
        </section>
      )}
    </AdminPage>
  );
}

const STATUS_LABEL = {
  hidden: 'Hidden — nobody sees it',
  partners: 'Open to owners — guests see nothing',
  public: 'Public — guests see it',
};

/**
 * Verticals (Farmhouse, Entertainment) and the launch switch. Same two-step
 * save as other catalogue records: preview shows who will see what, then confirm.
 */
export function VerticalList({ data }) {
  return (
    <AdminPage className="space-y-6">
      <Nav type="verticals" />
      <AdminPageHeader title="Verticals" />
      <p>
        The kinds of place guests switch between. Status is the launch switch: open a vertical to
        owners first, make it public once enough places are live. Farmhouse always stays public.
      </p>
      <ul className="space-y-4">
        {data.items.map((v) => (
          <VerticalRow key={v.code} vertical={v} canWrite={data.canWrite} />
        ))}
      </ul>
    </AdminPage>
  );
}

function VerticalRow({ vertical: v, canWrite }) {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [pending, startTransition] = useTransition();
  const submit = (event) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const input = {
      version: v.version,
      name: String(f.get('name')),
      sortOrder: Number(f.get('sortOrder')),
      status: String(f.get('status')),
      reason: String(f.get('reason')),
      preview: true,
    };
    setProposal(input);
    startTransition(async () => setResult(await catalogueCommand('verticals', v.code, input)));
  };
  const confirm = () =>
    startTransition(async () => {
      const saved = await catalogueCommand('verticals', v.code, {
        ...proposal,
        preview: false,
        previewHash: result.previewHash,
      });
      setResult(saved);
      setProposal(null);
      if (saved.ok) router.refresh();
    });
  return (
    <li className="rounded-md border border-ink-200 p-4">
      <p className="font-semibold">
        {v.name} <span className="font-normal text-ink-600">({v.code})</span>
      </p>
      <p className="text-meta">
        {STATUS_LABEL[v.status] ?? v.status} · {v.categories} categories · {v.live} live listings
      </p>
      {canWrite && (
        <form
          onSubmit={submit}
          onChange={() => setResult(null)}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <label className="block">
            Name
            <input
              name="name"
              className={inputClass}
              defaultValue={v.name}
              required
              minLength={2}
              maxLength={60}
            />
          </label>
          <label className="block">
            Display order
            <input
              name="sortOrder"
              type="number"
              min={0}
              max={10000}
              className={inputClass}
              defaultValue={v.sortOrder}
              required
            />
          </label>
          <label className="block">
            Status
            <select
              name="status"
              className={inputClass}
              defaultValue={v.status}
              disabled={v.code === 'farmhouse'}
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {v.code === 'farmhouse' && <input type="hidden" name="status" value="public" />}
          </label>
          <label className="block">
            Reason for change
            <input name="reason" className={inputClass} required minLength={10} maxLength={1000} />
          </label>
          <button
            disabled={pending}
            className={`${buttonClass} sm:col-span-2 sm:justify-self-start`}
          >
            Preview changes
          </button>
        </form>
      )}
      {result?.error && (
        <p role="alert" className="mt-3 rounded-md border border-danger/30 p-3">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p role="status" className="mt-3">
          Saved. The public site refreshes within a few minutes.
        </p>
      )}
      {result?.preview && (
        <section
          aria-label="Change preview"
          className="mt-3 space-y-2 rounded-md border-2 border-ink-900 p-4"
        >
          <p>{result.effect}</p>
          <button disabled={pending || !proposal} onClick={confirm} className={buttonClass}>
            Confirm and save
          </button>
        </section>
      )}
    </li>
  );
}

const KIND_ICON = {
  station: TrainFront,
  airport: Plane,
  temple: Landmark,
  business: Briefcase,
  hospital: Hospital,
  attraction: FerrisWheel,
  education: GraduationCap,
  mall: ShoppingBag,
};
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

/**
 * Landmarks guests search near (hotels). No preview step: the API saves directly.
 * Slugs are public URLs (/hotels/near/{slug}), so they are fixed once saved.
 */
export function LandmarkList({ data }) {
  const [cityId, setCityId] = useState('');
  const items = cityId ? data.items.filter((l) => l.cityId === cityId) : data.items;
  const groups = Object.entries(Object.groupBy(items, (l) => l.cityName));
  return (
    <AdminPage className="space-y-6">
      <Nav type="landmarks" />
      <AdminPageHeader title="Landmarks" />
      <p>
        Places guests search hotels near. Each landmark has a public page at /hotels/near/
        {'{slug}'}; the slug never changes once saved.
      </p>
      {!data.canWrite && <AdminReadOnly />}
      {data.canWrite && (
        <details className="rounded-md border border-ink-200 p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline">
            Add landmark
          </summary>
          <LandmarkForm data={data} />
        </details>
      )}
      <label className="block max-w-xs">
        City
        <select
          className={inputClass}
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
        >
          <option value="">All cities</option>
          {data.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p role="status">{items.length} landmarks</p>
      {!items.length && (
        <AdminEmpty title="No landmarks" description="Choose another city or add a landmark." />
      )}
      {groups.map(([city, list]) => (
        <section key={city} aria-label={city} className="space-y-3">
          <h2 className="text-h4 font-semibold">{city}</h2>
          <ul className="space-y-3">
            {list.map((l) => (
              <LandmarkRow key={l.id} landmark={l} data={data} />
            ))}
          </ul>
        </section>
      ))}
    </AdminPage>
  );
}

function LandmarkRow({ landmark: l, data }) {
  const Icon = KIND_ICON[l.kind] ?? MapPin;
  return (
    <li className="min-w-0 rounded-md border border-ink-200 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-md border border-ink-200 text-ink-800"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words">
            {l.name}{' '}
            <span className="font-normal text-ink-600">
              · {l.kind}
              {l.isActive ? '' : ' · Inactive'}
            </span>
          </p>
          <p className="text-meta text-ink-600 tabular">
            {l.latitude.toFixed(6)}, {l.longitude.toFixed(6)} · Order {l.sortOrder}
          </p>
          <Link
            className="inline-flex min-h-11 items-center break-all underline"
            href={`/hotels/near/${l.slug}`}
          >
            /hotels/near/{l.slug}
          </Link>
        </div>
      </div>
      {data.canWrite && (
        <details className="mt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center underline">
            Edit <span className="sr-only">{l.name}</span>
          </summary>
          <LandmarkForm data={data} landmark={l} />
        </details>
      )}
    </li>
  );
}

function LandmarkForm({ data, landmark: l }) {
  const router = useRouter();
  const creating = !l;
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(l?.name ?? '');
  const [slug, setSlug] = useState(l?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    const input = {
      ...(creating ? {} : { version: l.version }),
      cityId: String(f.get('cityId')),
      slug,
      name: name.trim(),
      kind: String(f.get('kind')),
      latitude: Number(f.get('latitude')),
      longitude: Number(f.get('longitude')),
      sortOrder: Number(f.get('sortOrder')),
      isActive: f.get('isActive') === 'on',
      reason: String(f.get('reason')).trim(),
    };
    startTransition(async () => {
      const saved = await catalogueCommand('landmarks', l?.id || 'new', input);
      setResult(saved);
      if (saved.ok) {
        if (creating) {
          form.reset();
          setName('');
          setSlug('');
          setSlugEdited(false);
        }
        router.refresh();
      }
    });
  };
  return (
    <form
      key={l?.version}
      onSubmit={submit}
      onChange={() => setResult(null)}
      className="mt-3 grid gap-3 sm:grid-cols-2"
    >
      <fieldset disabled={pending} className="contents">
        <label className="block">
          Name
          <input
            name="name"
            className={inputClass}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (creating && !slugEdited) setSlug(slugify(event.target.value));
            }}
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label className="block">
          Permanent slug
          <input
            name="slug"
            className={`${inputClass} read-only:bg-ink-25`}
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugEdited(true);
            }}
            readOnly={!creating}
            aria-describedby={creating ? undefined : `slug-note-${l.id}`}
            required
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
          {!creating && (
            <span id={`slug-note-${l.id}`} className="text-tiny text-ink-600">
              Fixed: this is a public link.
            </span>
          )}
        </label>
        <label className="block">
          City
          <select name="cityId" className={inputClass} defaultValue={l?.cityId} required>
            {data.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Kind
          <select name="kind" className={inputClass} defaultValue={l?.kind} required>
            {data.kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Latitude
          <input
            name="latitude"
            type="number"
            step="0.000001"
            min={-90}
            max={90}
            className={inputClass}
            defaultValue={l?.latitude}
            required
          />
        </label>
        <label className="block">
          Longitude
          <input
            name="longitude"
            type="number"
            step="0.000001"
            min={-180}
            max={180}
            className={inputClass}
            defaultValue={l?.longitude}
            required
          />
        </label>
        <label className="block">
          Display order
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={10000}
            className={inputClass}
            defaultValue={l?.sortOrder ?? 0}
            required
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end">
          <input type="checkbox" name="isActive" defaultChecked={l?.isActive ?? true} />
          Active
        </label>
        <label className="block sm:col-span-2">
          Reason for change
          <input name="reason" className={inputClass} required minLength={10} maxLength={1000} />
        </label>
        <button className={`${buttonClass} sm:col-span-2 sm:justify-self-start`}>
          {creating ? 'Add landmark' : 'Save changes'}
        </button>
      </fieldset>
      {pending && (
        <p role="status" className="sm:col-span-2">
          Saving…
        </p>
      )}
      {result?.error && (
        <p role="alert" className="rounded-md border border-danger/30 p-3 sm:col-span-2">
          {result.error}
        </p>
      )}
      {result?.code === 'STALE_PREVIEW' && (
        <button
          type="button"
          className={`${buttonClass} sm:col-span-2 sm:justify-self-start`}
          onClick={() => {
            setResult(null);
            router.refresh();
          }}
        >
          Reload latest record
        </button>
      )}
      {result?.ok && (
        <p role="status" className="sm:col-span-2">
          Landmark saved.
        </p>
      )}
    </form>
  );
}

/** Icon select with a live preview of what owners and guests will see. */
function IconKeyField({ defaultValue }) {
  const [iconKey, setIconKey] = useState(defaultValue);
  return (
    <label className="block">
      Icon
      <span className="mt-1 flex items-center gap-3">
        <select
          aria-label="Icon"
          name="iconKey"
          className={inputClass}
          value={iconKey}
          onChange={(event) => setIconKey(event.target.value)}
        >
          <option value="">Generic</option>
          {ICON_KEYS.map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
        <span
          className="grid size-11 shrink-0 place-items-center rounded-md border border-ink-200 text-ink-800"
          aria-hidden="true"
        >
          {iconKey === 'farmhouse' ? (
            <VerticalIcon code="farmhouse" className="size-7" />
          ) : (
            <ActivityIcon iconKey={iconKey} className="size-6" />
          )}
        </span>
      </span>
    </label>
  );
}

/**
 * Closed beta invites (hotel plan, Phase 9): phones that may open Hotels while it
 * is open to partners only. Guests use the invite link /beta after logging in.
 */
export function BetaGuests({ data }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [phones, setPhones] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const run = (input) =>
    start(async () => {
      const outcome = await betaInviteCommand('hotel', input);
      setResult(outcome);
      if (outcome?.ok) {
        setPhones('');
        router.refresh();
      }
    });
  const inBeta = data.vertical.status === 'partners';
  return (
    <AdminPage className="space-y-6">
      <Nav type="beta" />
      <AdminPageHeader title="Hotel beta" />
      <p>
        While Hotels is open to partners only, the guests below can see and book hotels after they
        log in and open <strong>/beta</strong>. Everyone else, and search engines, see nothing. A
        removed guest keeps access for up to 7 days.
      </p>
      {!inBeta ? (
        <p role="status" className="rounded-md bg-ink-50 p-3">
          Hotels is {data.vertical.status}. Invites work only while it is open to partners.
        </p>
      ) : null}
      {!data.canWrite && <AdminReadOnly />}
      {data.canWrite && inBeta ? (
        <form
          className="space-y-3 rounded-md border border-ink-200 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run({ action: 'invite', phones, note: note || undefined });
          }}
        >
          <label className="block">
            Mobile numbers (one per line)
            <textarea
              required
              rows={4}
              value={phones}
              onChange={(event) => setPhones(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block max-w-sm">
            Note (optional)
            <input
              maxLength={120}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
            />
          </label>
          <button disabled={pending} className={sharedButtonVariants()}>
            {pending ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      ) : null}
      {result?.error ? <p role="alert">{result.error}</p> : null}
      {result?.ok && result.added != null ? (
        <p role="status">
          {result.added} invited
          {result.alreadyInvited ? `, ${result.alreadyInvited} already on the list` : ''}.
        </p>
      ) : null}
      <p role="status">{data.items.length} invited guests</p>
      <ul className="divide-y divide-ink-200 rounded-md border border-ink-200">
        {data.items.map((guest) => (
          <li key={guest.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <span>
              <strong>{guest.phone}</strong>
              {guest.note ? ` · ${guest.note}` : ''}
              <span className="block text-tiny text-ink-600">
                {guest.hasAccount ? 'Has a Rentra account' : 'No account yet'} · invited by{' '}
                {guest.invitedBy}
              </span>
            </span>
            {data.canWrite ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ action: 'revoke', id: guest.id })}
                className="min-h-11 underline"
                aria-label={`Remove ${guest.phone} from the beta`}
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
