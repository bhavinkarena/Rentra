'use client';

import { useActionState, useState } from 'react';
import { Loader2, Upload, ShieldCheck, Check, Trash2, FileText } from 'lucide-react';
import { uploadKycDocuments, deleteKycDocument } from '@/lib/auth/documents';
import { ID_DOCUMENT_TYPES, ID_DOCUMENT_BY_ID, MAX_DOC_BYTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Front and back photos of one ID.
 *
 * The images go to authenticated Cloudinary storage — no public URL for them
 * ever exists — and only a signed, 5-minute URL can fetch one, minted per
 * admin view and audited. Nothing about the document is shown back to the
 * Client except "uploaded", because there is no reason to re-render somebody's
 * ID into a page.
 */
export default function KycUploadForm({ application, documents = [] }) {
  const [state, action, pending] = useActionState(uploadKycDocuments, {});
  const [deleteState, deleteAction, deleting] = useActionState(deleteKycDocument, {});
  const [docType, setDocType] = useState(application?.kycDocType ?? 'pan_card');
  const [picked, setPicked] = useState({});

  const e = state.errors ?? {};
  const spec = ID_DOCUMENT_BY_ID[docType];

  const existing = Object.fromEntries(
    documents.filter((d) => d.docType === docType).map((d) => [d.side, d]),
  );

  function onPick(side, event) {
    const file = event.target.files?.[0];
    setPicked((p) => ({
      ...p,
      [side]: file ? { name: file.name, size: file.size, tooBig: file.size > MAX_DOC_BYTES } : null,
    }));
  }

  return (
    <div className="space-y-6">
      {e._ ? (
        <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          {e._}
        </p>
      ) : null}
      {deleteState.errors?._ ? (
        <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          {deleteState.errors._}
        </p>
      ) : null}

      <form action={action} className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-meta font-semibold text-ink-700">
            Which ID will you use?
          </legend>
          <div className="space-y-2">
            {ID_DOCUMENT_TYPES.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                  docType === d.id ? 'border-brand-600 bg-brand-50' : 'border-input hover:bg-ink-50'
                }`}
              >
                <input
                  type="radio"
                  name="docType"
                  value={d.id}
                  checked={docType === d.id}
                  onChange={() => { setDocType(d.id); setPicked({}); }}
                  className="mt-1 size-4 shrink-0 accent-brand-600"
                />
                <span>
                  <span className="block text-meta font-semibold text-ink-900">
                    {d.label}
                    <span className="ml-2 font-normal text-ink-500">
                      {d.sides.length === 1 ? '1 photo' : '2 photos'}
                    </span>
                  </span>
                  {d.note ? (
                    <span className="block text-tiny text-ink-500">{d.note}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          {e.docType ? <p className="mt-1.5 text-tiny font-medium text-danger">{e.docType}</p> : null}
        </fieldset>

        {spec?.requiresMaskConfirm ? (
          <label className="flex cursor-pointer gap-3 rounded-md border border-amber-300 bg-amber-100 p-3">
            <input type="checkbox" name="maskedConfirmed" className="mt-1 size-4 shrink-0 accent-brand-600" />
            <span className="text-meta text-amber-700">
              I confirm this is the <strong>masked</strong> Aadhaar downloaded from the UIDAI
              website, with the first 8 digits hidden. Rentra cannot accept a full Aadhaar copy.
            </span>
          </label>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {spec?.sides.map((side) => (
            <SlotField
              key={side}
              side={side}
              error={e[side]}
              picked={picked[side]}
              existing={existing[side]}
              onPick={onPick}
            />
          ))}
        </div>

        <div>
          <label htmlFor="kycNameOnDoc" className="mb-1.5 block text-meta font-semibold text-ink-700">
            Name exactly as printed on that ID
          </label>
          <Input
            id="kycNameOnDoc"
            name="kycNameOnDoc"
            defaultValue={application?.kycNameOnDoc ?? ''}
            aria-invalid={e.kycNameOnDoc ? true : undefined}
            required
          />
          {e.kycNameOnDoc ? (
            <p className="mt-1.5 text-tiny font-medium text-danger">{e.kycNameOnDoc}</p>
          ) : (
            <p className="mt-1.5 text-tiny text-ink-500">
              If it differs from your account name we will ask about it at review, rather than
              reject you — a document in a family member&rsquo;s name is common and fixable.
            </p>
          )}
        </div>

        <p className="rounded-md border-l-4 border-blue bg-info-bg p-3 text-tiny text-ink-700">
          <strong className="font-semibold">How these are stored:</strong> in private storage that
          has no public web address. Only a Rentra reviewer can open one, through a link that
          expires in five minutes, and every time one is opened it is logged. We keep no copy of
          your document number.
        </p>

        <Button type="submit" size="lg" className="w-full" disabled={pending || deleting}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {pending ? 'Uploading…' : 'Upload and continue'}
        </Button>
      </form>

      {documents.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-meta font-semibold text-ink-900">Already uploaded</h2>
          <ul className="mt-2 divide-y divide-border">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2 text-meta">
                <FileText className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink-900">
                    {ID_DOCUMENT_BY_ID[d.docType]?.label ?? d.docType}
                    <span className="ml-1.5 font-normal text-ink-500">· {d.side}</span>
                  </span>
                  <span className="block text-tiny text-ink-500">
                    {d.status === 'rejected'
                      ? `Rejected — ${d.reviewNote ?? 'please upload a clearer photo'}`
                      : `${Math.round((d.bytes ?? 0) / 1024)}KB · uploaded ${new Date(d.uploadedAt).toLocaleDateString('en-IN')}`}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-tiny font-bold ${
                  d.status === 'accepted' ? 'bg-brand-50 text-brand-700'
                    : d.status === 'rejected' ? 'bg-danger-bg text-danger'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {d.status}
                </span>
                <form action={deleteAction} className="shrink-0">
                  <input type="hidden" name="documentId" value={d.id} />
                  <button
                    type="submit"
                    disabled={deleting}
                    aria-label={`Delete ${d.side}`}
                    className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-danger-bg hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-tiny text-ink-500">
            Deleting removes the file itself, not just this row.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function SlotField({ side, error, picked, existing, onPick }) {
  const label = side === 'front' ? 'Front of the ID' : 'Back of the ID';

  return (
    <div>
      <label htmlFor={`file-${side}`} className="mb-1.5 block text-meta font-semibold text-ink-700">
        {label}
        {existing ? (
          <span className="ml-2 inline-flex items-center gap-1 font-normal text-brand-700">
            <Check className="size-3.5" aria-hidden="true" /> uploaded
          </span>
        ) : null}
      </label>

      <label
        htmlFor={`file-${side}`}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-5 text-center transition-colors ${
          error || picked?.tooBig
            ? 'border-danger/50 bg-danger-bg'
            : picked || existing
              ? 'border-brand-300 bg-brand-50'
              : 'border-input hover:bg-ink-50'
        }`}
      >
        <Upload className="size-5 text-ink-500" aria-hidden="true" />
        <span className="text-meta font-medium text-ink-800">
          {picked ? picked.name : existing ? 'Replace photo' : 'Choose a photo'}
        </span>
        <span className="text-tiny text-ink-500">
          {picked
            ? `${(picked.size / 1024 / 1024).toFixed(1)}MB${picked.tooBig ? ' — too large' : ''}`
            : 'JPG, PNG, WEBP or PDF · up to 2MB'}
        </span>
      </label>

      <input
        id={`file-${side}`}
        name={side}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        onChange={(ev) => onPick(side, ev)}
        className="sr-only"
        // Required only when nothing is on file yet — a re-upload can change
        // one side without re-picking the other.
        required={!existing}
      />

      {error ? <p className="mt-1.5 text-tiny font-medium text-danger">{error}</p> : null}
    </div>
  );
}
