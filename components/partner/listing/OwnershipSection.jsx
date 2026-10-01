'use client';
import { useActionState, useState } from 'react';
import { Upload, Pause } from 'lucide-react';
import { uploadOwnershipDocument } from '@/lib/actions/partner';
import { ownershipDocTypesFor } from '@/lib/domain/listing-completion';
import { Input, Field, Section, SaveButton, inputCls } from './SectionPrimitives';
export function OwnershipSection({ listing, documents, clientType, kycName }) {
  const [state, action, pending] = useActionState(uploadOwnershipDocument, {});
  const OWNERSHIP_DOC_TYPES = ownershipDocTypesFor(listing.rentalUnit);
  const [docType, setDocType] = useState(documents[0]?.docType ?? OWNERSHIP_DOC_TYPES[0].id);
  const e = state.errors ?? {};

  const options = OWNERSHIP_DOC_TYPES.filter(
    (d) => !d.agentOnly || clientType === 'authorised_agent',
  );
  const spec = OWNERSHIP_DOC_TYPES.find((d) => d.id === docType);

  return (
    <Section
      id="ownership"
      title={listing.rentalUnit === 'hour' ? 'Proof you can list it' : 'Proof it is yours'}
      intro={
        listing.rentalUnit === 'hour'
          ? 'One document showing you own or lease the premises, or run the business there, name-matched against your ID.'
          : 'One document, with the name matched against your ID. This is the check that separates Rentra from a classified ad.'
      }
      state={state}
      pending={pending}
    >
      {documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-meta"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {OWNERSHIP_DOC_TYPES.find((t) => t.id === d.docType)?.label ?? d.docType}
                </span>
                <span className="block text-tiny text-ink-500">
                  In the name of {d.nameOnDocument ?? '—'}
                  {d.issuedAt ? ` · issued ${d.issuedAt}` : ''}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-tiny font-bold ${
                  d.status === 'accepted'
                    ? 'bg-brand-50 text-brand-700'
                    : d.status === 'rejected'
                      ? 'bg-danger-bg text-danger'
                      : 'bg-warning-bg text-warning'
                }`}
              >
                {d.status}
              </span>
              {d.status === 'rejected' && d.reviewNote ? (
                <p className="w-full text-tiny text-danger">{d.reviewNote}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={listing.id} />
        <fieldset>
          <legend className="mb-2 text-meta font-semibold text-ink-700">Which document?</legend>
          <div className="space-y-2">
            {options.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
                  docType === d.id ? 'border-brand-600 bg-brand-50' : 'border-input hover:bg-ink-50'
                }`}
              >
                <input
                  type="radio"
                  name="docType"
                  value={d.id}
                  checked={docType === d.id}
                  onChange={() => setDocType(d.id)}
                  className="mt-1 size-4 shrink-0 accent-brand-600"
                />
                <span>
                  <span className="block text-meta font-semibold text-ink-900">{d.label}</span>
                  {d.note ? <span className="block text-tiny text-ink-500">{d.note}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          id="nameOnDocument"
          label="Name printed on it"
          hint={
            kycName
              ? `Your ID says “${kycName}”. If this document is in a family member's name, upload it anyway and we will ask — that is common and fixable, not a rejection.`
              : 'If it differs from your own name we will ask about it at review.'
          }
          error={e.nameOnDocument}
        >
          <Input
            id="nameOnDocument"
            name="nameOnDocument"
            defaultValue={documents[0]?.nameOnDocument ?? kycName ?? ''}
          />
        </Field>

        {spec?.freshMonths ? (
          <Field
            id="issuedAt"
            label="Issue date"
            hint={`Must be within the last ${spec.freshMonths} months.`}
            error={e.issuedAt}
          >
            <Input id="issuedAt" name="issuedAt" type="date" className="w-44" />
          </Field>
        ) : null}

        <Field id="file" label="Upload it" hint="JPG, PNG, WEBP or PDF · up to 2MB" error={e.file}>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className={inputCls}
          />
        </Field>

        <p className="rounded-md border-l-4 border-info bg-info-bg p-3 text-tiny text-ink-700">
          Stored privately with no public web address. Only a Rentra reviewer can open it, and every
          time one is opened it is logged.
        </p>

        <SaveButton pending={pending} label="Upload document" />
      </form>
    </Section>
  );
}

/* ------------------------------ submit bar ------------------------------ */

/**
 * Pause and resume.
 *
 * The alternative an owner reaches for when this is missing is deleting the
 * listing — which throws away the ownership document, the review history and
 * the photos, and makes coming back in March a full rebuild. Pausing is the
 * cheap, reversible version of the thing he was going to do anyway.
 */
