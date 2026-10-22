'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { hotelFinanceCommand } from '@/lib/actions/hotel-finance';
import {
  AdminPage,
  AdminPageHeader,
  AdminReadOnly,
  AdminTable,
  StatusBadge,
} from './AdminPrimitives';

/**
 * Hotel commission rules and tax slabs (hotel plan, Phase 4). Both save in two
 * steps: Preview shows the effect, Confirm saves exactly what was previewed.
 * Rules and slabs are never edited in place; a rule is ended and a new one added.
 */
const input = `${fieldClass} mt-1`;
const button = buttonVariants({ shape: 'default', size: 'default' });
const STATE_TONE = { active: 'success', scheduled: 'info', ended: 'neutral' };
const STATE_LABEL = { active: 'Active', scheduled: 'Starts later', ended: 'Ended' };
const SCOPE_LABEL = { vertical: 'All hotels', city: 'City rule', property: 'Property rule' };
const TIER_LABEL = {
  standard: 'Standard',
  founding: 'Founding',
  preferred: 'Preferred',
  chain: 'Chain',
};
const dateLabel = (value) =>
  value
    ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null;
const rupees = (minor) => `₹${(minor / 100).toLocaleString('en-IN')}`;

/** Preview → confirm against one command. */
function useTwoStep(kind) {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [pending, startTransition] = useTransition();
  const preview = (values) => {
    setProposal(values);
    startTransition(async () =>
      setResult(await hotelFinanceCommand(kind, { ...values, preview: true })),
    );
  };
  const confirm = () =>
    startTransition(async () => {
      const saved = await hotelFinanceCommand(kind, {
        ...proposal,
        preview: false,
        previewHash: result.previewHash,
      });
      setResult(saved);
      setProposal(null);
      if (saved.ok) router.refresh();
    });
  return {
    result,
    setResult,
    pending,
    preview,
    confirm,
    ready: Boolean(proposal && result?.preview),
  };
}

function Outcome({ step, saved }) {
  const { result, pending, confirm, ready } = step;
  const fieldErrors = result?.fields ? Object.values(result.fields).flat() : [];
  return (
    <div aria-live="polite">
      {result?.error ? (
        <div
          role="alert"
          className="mt-3 rounded-md border border-danger/30 bg-danger-bg p-3 text-meta text-danger"
        >
          <p className="font-semibold">{result.error}</p>
          {fieldErrors.length ? (
            <ul className="mt-1 list-disc pl-5">
              {fieldErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {result?.ok ? (
        <p role="status" className="mt-3 text-meta text-success">
          {saved}
        </p>
      ) : null}
      {ready ? (
        <section
          aria-label="Change preview"
          className="mt-3 space-y-3 rounded-md border-2 border-ink-900 p-4"
        >
          <p className="text-meta">{result.effect}</p>
          <button type="button" disabled={pending} onClick={confirm} className={button}>
            Confirm and save
          </button>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ commission */

export function CommissionRules({ data }) {
  const step = useTwoStep('commission');
  const [scope, setScope] = useState('vertical');
  const submit = (event) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    step.preview({
      action: 'create',
      scope,
      cityId: String(f.get('cityId') ?? ''),
      rentableId: String(f.get('rentableId') ?? ''),
      ratePercent: String(f.get('ratePercent')),
      tier: String(f.get('tier')),
      validFrom: String(f.get('validFrom')),
      validTo: String(f.get('validTo') ?? ''),
      reason: String(f.get('reason')),
    });
  };
  return (
    <AdminPage className="space-y-6">
      <AdminPageHeader
        title="Hotel commission"
        description="What hotels pay Rentra on room revenue. The most specific active rule wins: property, then city, then all hotels."
      />
      <AdminTable
        label="Commission rules"
        columns={['Applies to', 'Rate', 'Tier', 'Valid', 'Hotels', 'State', 'Set by']}
        minWidth={760}
        empty={
          data.items.length
            ? null
            : 'No commission rules yet. Hotel payouts cannot be calculated until one covers them.'
        }
      >
        {data.items.map((rule) => (
          <tr key={rule.id} className="border-t border-border align-top">
            <th scope="row" className="px-4 py-3 text-left font-semibold">
              {rule.target}
              <span className="block text-tiny font-normal text-ink-600">
                {SCOPE_LABEL[rule.scope]}
              </span>
            </th>
            <td className="px-4 py-3 tabular font-semibold">{rule.rateBps / 100}%</td>
            <td className="px-4 py-3">{TIER_LABEL[rule.tier] ?? rule.tier}</td>
            <td className="px-4 py-3">
              {dateLabel(rule.validFrom)} – {dateLabel(rule.validTo) ?? 'no end'}
            </td>
            <td className="px-4 py-3 tabular">{rule.hotels}</td>
            <td className="px-4 py-3">
              <StatusBadge tone={STATE_TONE[rule.state]}>{STATE_LABEL[rule.state]}</StatusBadge>
            </td>
            <td className="px-4 py-3 text-meta">
              {rule.createdBy ?? '—'}
              <span className="block text-tiny text-ink-600">{rule.reason}</span>
              {data.canWrite && rule.state !== 'ended' ? (
                <EndRule rule={rule} today={data.today} />
              ) : null}
            </td>
          </tr>
        ))}
      </AdminTable>

      {data.canWrite ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-h3">Add a rule</h2>
          <form
            onSubmit={submit}
            onChange={() => step.setResult(null)}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <label className="block text-meta font-semibold">
              Applies to
              <select className={input} value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="vertical">All hotels</option>
                <option value="city">A city</option>
                <option value="property">One hotel</option>
              </select>
            </label>
            {scope === 'city' ? (
              <label className="block text-meta font-semibold">
                City
                <select name="cityId" className={input} required defaultValue="">
                  <option value="">Choose a city</option>
                  {data.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : scope === 'property' ? (
              <label className="block text-meta font-semibold">
                Hotel
                <select name="rentableId" className={input} required defaultValue="">
                  <option value="">Choose a hotel</option>
                  {data.hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                      {h.city ? ` · ${h.city}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span />
            )}
            <label className="block text-meta font-semibold">
              Rate, % of room revenue
              <input
                name="ratePercent"
                type="number"
                min={0}
                max={30}
                step={0.01}
                required
                className={input}
              />
            </label>
            <label className="block text-meta font-semibold">
              Tier
              <select name="tier" className={input} defaultValue="standard">
                {Object.entries(TIER_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-meta font-semibold">
              Starts
              <input name="validFrom" type="date" min={data.today} required className={input} />
            </label>
            <label className="block text-meta font-semibold">
              Ends (optional)
              <input name="validTo" type="date" min={data.today} className={input} />
            </label>
            <label className="block text-meta font-semibold sm:col-span-2">
              Reason (kept in the audit log)
              <input name="reason" required minLength={10} maxLength={500} className={input} />
            </label>
            <button disabled={step.pending} className={`${button} sm:justify-self-start`}>
              Preview rule
            </button>
          </form>
          <Outcome step={step} saved="Rule saved. New bookings from its start date use it." />
        </section>
      ) : (
        <AdminReadOnly>
          You can see commission rules. Changing them needs finance write access.
        </AdminReadOnly>
      )}
    </AdminPage>
  );
}

function EndRule({ rule, today }) {
  const step = useTwoStep('commission');
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 min-h-11 text-tiny font-semibold text-brand-700 underline"
      >
        End this rule…
      </button>
    );
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        step.preview({
          action: 'end',
          id: rule.id,
          validTo: String(f.get('validTo')),
          reason: String(f.get('reason')),
        });
      }}
    >
      <label className="block text-tiny font-semibold">
        Last day
        <input
          name="validTo"
          type="date"
          min={rule.validFrom > today ? rule.validFrom : today}
          required
          className={input}
        />
      </label>
      <label className="block text-tiny font-semibold">
        Reason
        <input name="reason" required minLength={10} maxLength={500} className={input} />
      </label>
      <button disabled={step.pending} className={button}>
        Preview end
      </button>
      <Outcome step={step} saved="Rule end saved." />
    </form>
  );
}

/* ------------------------------------------------------------------ tax */

export function TaxSlabs({ data }) {
  const step = useTwoStep('tax');
  const [bands, setBands] = useState([
    { upTo: '7500', taxPercent: '5' },
    { upTo: '', taxPercent: '18' },
  ]);
  const groups = Object.entries(
    data.items.reduce(
      (acc, row) => ((acc[`${row.effectiveFrom}|${row.state}`] ??= []).push(row), acc),
      {},
    ),
  );
  const update = (index, patch) =>
    setBands((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const submit = (event) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    step.preview({
      effectiveFrom: String(f.get('effectiveFrom')),
      bands: JSON.stringify(
        bands.map((b, i) => ({
          upTo: i === bands.length - 1 ? '' : b.upTo,
          taxPercent: b.taxPercent,
        })),
      ),
      reason: String(f.get('reason')),
    });
  };
  return (
    <AdminPage className="space-y-6">
      <AdminPageHeader
        title="Hotel tax"
        description="GST on hotel rooms, decided per room per night on the tariff charged. Bookings and quotes already made keep their tax."
      />
      {groups.map(([key, rows]) => {
        const [from, state] = key.split('|');
        return (
          <section key={key} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h4">
                From {dateLabel(from)}
                {rows[0].effectiveTo ? ` to ${dateLabel(rows[0].effectiveTo)}` : ''}
              </h2>
              <StatusBadge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</StatusBadge>
            </div>
            <ul className="mt-3 divide-y divide-border text-meta">
              {rows.map((row) => (
                <li key={row.id} className="flex justify-between gap-3 py-2 tabular">
                  <span>
                    {row.toMinor == null
                      ? `Above ${rupees(row.fromMinor - 1)}`
                      : `${rupees(row.fromMinor)} – ${rupees(row.toMinor)}`}{' '}
                    per room per night
                  </span>
                  <strong>{row.taxBps / 100}%</strong>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-tiny text-ink-600">{rows[0].note}</p>
          </section>
        );
      })}

      {data.canWrite ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-h3">Schedule new rates</h2>
          <p className="mt-1 text-meta text-ink-600">
            Use this only for a change in the law, confirmed by the CA. The current rates end the
            day before.
          </p>
          <form onSubmit={submit} onChange={() => step.setResult(null)} className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-meta font-semibold">Bands, per room per night</legend>
              {bands.map((band, index) => {
                const last = index === bands.length - 1;
                return (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_8rem] items-end gap-3">
                    <label className="block text-meta">
                      {last
                        ? 'Above the previous limit'
                        : index === 0
                          ? 'Up to ₹'
                          : 'Next band up to ₹'}
                      <input
                        type="number"
                        min={1}
                        disabled={last}
                        value={last ? '' : band.upTo}
                        onChange={(e) => update(index, { upTo: e.target.value })}
                        className={input}
                        aria-label={
                          last ? 'No upper limit' : `Band ${index + 1} upper limit in rupees`
                        }
                      />
                    </label>
                    <label className="block text-meta">
                      GST %
                      <input
                        type="number"
                        min={0}
                        max={28}
                        step={0.01}
                        required
                        value={band.taxPercent}
                        onChange={(e) => update(index, { taxPercent: e.target.value })}
                        className={input}
                      />
                    </label>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={bands.length >= 6}
                  onClick={() =>
                    setBands((rows) => [
                      ...rows.slice(0, -1),
                      { upTo: '', taxPercent: '' },
                      rows.at(-1),
                    ])
                  }
                  className="min-h-11 rounded-md border border-border px-3 text-meta font-semibold text-brand-700"
                >
                  Add a band
                </button>
                <button
                  type="button"
                  disabled={bands.length <= 1}
                  onClick={() => setBands((rows) => [...rows.slice(0, -2), rows.at(-1)])}
                  className="min-h-11 rounded-md border border-border px-3 text-meta font-semibold text-ink-700"
                >
                  Remove a band
                </button>
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-meta font-semibold">
                Starts
                <input
                  name="effectiveFrom"
                  type="date"
                  min={data.today}
                  required
                  className={input}
                />
              </label>
              <label className="block text-meta font-semibold">
                Reason (notification number)
                <input name="reason" required minLength={10} maxLength={500} className={input} />
              </label>
            </div>
            <button disabled={step.pending} className={button}>
              Preview rates
            </button>
          </form>
          <Outcome step={step} saved="New rates scheduled." />
        </section>
      ) : (
        <AdminReadOnly>
          You can see tax rates. Changing them needs finance write access.
        </AdminReadOnly>
      )}
    </AdminPage>
  );
}
