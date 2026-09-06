'use client';

import { useActionState, useState } from 'react';
import { Loader2, Check, X, FileText, ExternalLink } from 'lucide-react';
import { reviewDocument } from '@/lib/auth/admin-actions';
import { ID_DOCUMENT_BY_ID } from '@/lib/constants';

/**
 * KYC documents, streamed through Rentra rather than linked from storage.
 *
 * The page only ever receives metadata. Opening one hits
 * `GET /admin/documents/[id]`, which re-checks the live admin session, streams
 * the bytes with `Cache-Control: private, no-store`, and writes a
 * `document_viewed` audit row.
 *
 * We deliberately do NOT hand a Cloudinary URL to the browser. Cloudinary's
 * expiring tokens are a paid add-on, so without them a signed URL never
 * expires — verified: an "expired" one still returned HTTP 200. Proxying is
 * stronger than expiry anyway: revoking an admin revokes access to every
 * document immediately, and no storage URL exists in history or a referrer.
 */
export default function DocumentViewer({ documents = [], kycNameOnDoc, accountName }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-100 p-4">
        <p className="text-meta font-semibold text-amber-700">No identity document uploaded</p>
        <p className="mt-1 text-tiny text-ink-700">
          The application cannot be approved without one. Send it back asking for photos of an ID.
        </p>
      </div>
    );
  }

  const nameMatch = kycNameOnDoc && accountName
    ? (kycNameOnDoc.trim().toLowerCase() === accountName.trim().toLowerCase() ? 'exact' : 'mismatch')
    : 'unknown';

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-tiny font-bold tracking-wider text-brand-700 uppercase">
          Identity document
        </h2>
        <span className={`text-tiny font-bold ${
          nameMatch === 'exact' ? 'text-brand-700'
            : nameMatch === 'mismatch' ? 'text-amber-700' : 'text-ink-500'
        }`}>
          {nameMatch === 'exact' ? 'Name matches account'
            : nameMatch === 'mismatch' ? 'Name differs from account'
              : 'Name not comparable'}
        </span>
      </div>

      <dl className="mt-2 text-meta">
        <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5">
          <dt className="text-ink-600">Name on document</dt>
          <dd className="font-medium">{kycNameOnDoc || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3 py-1.5">
          <dt className="text-ink-600">Account name</dt>
          <dd className="font-medium">{accountName || '—'}</dd>
        </div>
      </dl>

      {nameMatch === 'mismatch' ? (
        <p className="mt-2 rounded-md bg-amber-100 p-2.5 text-tiny text-amber-700">
          A family or HUF name here is the most common real case and is <strong>not</strong> a
          rejection — ask for a relationship proof or a no-objection letter, or approve them as an
          authorised agent so the listing publicly says &ldquo;Authorised manager&rdquo;.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {documents.map((d) => <DocRow key={d.id} doc={d} />)}
      </ul>

      <p className="mt-3 text-tiny text-ink-500">
        Documents are streamed through Rentra, never linked from storage. Access is re-checked on
        every request and every view is recorded against your name.
      </p>
    </section>
  );
}

function DocRow({ doc }) {
  const [reviewState, reviewAction, reviewing] = useActionState(reviewDocument, {});
  const [note, setNote] = useState('');

  const status = reviewState.ok ? reviewState.outcome : doc.status;
  const label = ID_DOCUMENT_BY_ID[doc.docType]?.label ?? doc.docType;

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-meta font-semibold text-ink-900">
            {label}
            <span className="ml-1.5 font-normal text-ink-500">· {doc.side}</span>
          </span>
          <span className="block text-tiny text-ink-500">
            {Math.round((doc.bytes ?? 0) / 1024)}KB · {doc.mimeType} ·{' '}
            {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
          </span>
        </span>

        <span className={`shrink-0 rounded-full px-2 py-0.5 text-tiny font-bold ${
          status === 'accepted' ? 'bg-brand-50 text-brand-700'
            : status === 'rejected' ? 'bg-danger-bg text-danger'
              : 'bg-amber-100 text-amber-700'
        }`}>
          {status}
        </span>

        <a
          href={`/admin/documents/${doc.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-meta font-semibold text-white hover:bg-brand-700"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Open {doc.side}
        </a>
      </div>

      {/* Per-document accept/reject, separate from the application decision:
          "this photo is unreadable" is a different problem from "this person
          cannot be verified", and conflating them loses information. */}
      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-dashed border-border pt-3">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-tiny font-semibold text-ink-700">
            Note (required to reject — the Client sees it)
          </span>
          <input
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="e.g. the back is blurred, please re-take it in better light"
            className="w-full rounded-sm border border-input bg-card px-3 py-2 text-meta placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
          />
        </label>
        <form action={reviewAction} className="flex shrink-0 gap-2">
          <input type="hidden" name="documentId" value={doc.id} />
          <input type="hidden" name="note" value={note} />
          <button
            type="submit" name="outcome" value="accepted" disabled={reviewing}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-600 bg-brand-50 px-3 py-2 text-meta font-semibold text-brand-700 hover:bg-brand-100"
          >
            {reviewing ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Accept
          </button>
          <button
            type="submit" name="outcome" value="rejected" disabled={reviewing}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-meta font-semibold text-danger hover:brightness-95"
          >
            <X className="size-3.5" aria-hidden="true" /> Reject
          </button>
        </form>
      </div>

      {reviewState.errors?.note ? (
        <p className="mt-1.5 text-tiny font-medium text-danger">{reviewState.errors.note}</p>
      ) : null}
      {reviewState.errors?._ ? (
        <p className="mt-1.5 text-tiny font-medium text-danger">{reviewState.errors._}</p>
      ) : null}
      {doc.reviewNote && !reviewState.ok ? (
        <p className="mt-1.5 text-tiny text-ink-600">Previous note: &ldquo;{doc.reviewNote}&rdquo;</p>
      ) : null}
    </li>
  );
}
