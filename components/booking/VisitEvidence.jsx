import { randomUUID } from 'node:crypto';
import { Camera, History, ShieldAlert, UserRound } from 'lucide-react';
import { bookingTime as time } from '@/lib/domain/booking-record';
import { CloseIncidentForm, CorrectionForm, IncidentForm } from './EvidenceForms';

const PHASE = { handover: 'Handover', return: 'Return', complete: 'Completion' };
const CATEGORY = {
  damage: 'Damage',
  safety: 'Safety',
  access: 'Access or entry',
  conduct: 'Guest conduct',
  amenity: 'Amenity failure',
  other: 'Other',
};
const REPORTABLE = ['confirmed', 'handed_over', 'returned', 'completed', 'disputed'];
const chip = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold';

function Nature({ nature }) {
  return nature === 'actual' ? (
    <span className={`${chip} bg-success-bg text-success`}>Actual</span>
  ) : (
    <span className={`${chip} bg-amber-100 text-amber-800`}>Test / simulation</span>
  );
}

function who(kind, name, admin) {
  if (admin) return `${kind === 'owner' ? 'Owner' : 'Admin'}${name ? ` · ${name}` : ''}`;
  return kind === 'owner' ? 'You' : 'Rentra operations';
}

const size = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Links, not thumbnails: every view is an audited read, so nothing loads until asked. */
function Photos({ items, href, label }) {
  if (!items?.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`${label} photos`}>
      {items.map((photo, index) => (
        <li key={photo.id}>
          <a
            href={href(photo.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            <Camera className="size-3.5" aria-hidden="true" />
            Photo {index + 1} · {size(photo.bytes)}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Evidence({ item, href, timeZone, admin }) {
  return (
    <li className="space-y-1.5 rounded-md border border-border p-3 text-meta">
      <div className="flex flex-wrap items-center gap-2">
        <strong>{PHASE[item.kind] ?? item.kind}</strong>
        <Nature nature={item.nature} />
        {item.corrected ? (
          <span className={`${chip} bg-info-bg text-ink-800`}>
            <History className="size-3" aria-hidden="true" />
            Corrected
          </span>
        ) : null}
      </div>
      <p>
        Occurred {time(item.occurredAt, timeZone)} · recorded {time(item.recordedAt, timeZone)}
      </p>
      <p className="flex flex-wrap items-center gap-1 text-ink-600">
        <UserRound className="size-3.5" aria-hidden="true" />
        {who(item.actorKind, item.actorName, admin)}
        {item.visitVersion != null ? ` · recorded against visit version ${item.visitVersion}` : ''}
      </p>
      <p className="break-words">{item.note}</p>
      <Photos items={item.attachments} href={href} label={PHASE[item.kind] ?? 'Evidence'} />
      {item.corrected ? (
        <details>
          <summary className="min-h-10 cursor-pointer font-semibold">
            Original and {item.corrections.length} correction
            {item.corrections.length === 1 ? '' : 's'}
          </summary>
          <ol className="mt-2 space-y-2 border-l-2 border-border pl-3">
            <li>
              <span className="font-semibold">Original</span> · occurred{' '}
              {time(item.original.occurredAt, timeZone)}
              <p className="break-words">{item.original.note}</p>
            </li>
            {item.corrections.map((correction) => (
              <li key={correction.id}>
                <span className="font-semibold">
                  Correction · {time(correction.createdAt, timeZone)}
                  {correction.actorName ? ` · ${correction.actorName}` : ' · Rentra operations'}
                </span>
                <p>Reason: {correction.reason}</p>
                {correction.correctedOccurredAt ? (
                  <p>Time → {time(correction.correctedOccurredAt, timeZone)}</p>
                ) : null}
                {correction.correctedNote ? (
                  <p className="break-words">Note → {correction.correctedNote}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {admin ? (
        <CorrectionForm
          key={`${item.id}-${item.headCorrectionId ?? 'original'}`}
          evidence={item}
          requestKey={randomUUID()}
        />
      ) : null}
    </li>
  );
}

function Incident({ incident, href, timeZone, admin }) {
  const open = incident.state === 'open';
  return (
    <li className="space-y-1.5 rounded-md border border-border p-3 text-meta">
      <div className="flex flex-wrap items-center gap-2">
        <strong>{incident.reference}</strong>
        <span
          className={`${chip} ${open ? 'bg-amber-100 text-amber-800' : 'bg-ink-50 text-ink-700'}`}
        >
          {open ? 'Open' : 'Closed'}
        </span>
        <span className={`${chip} bg-brand-50 text-brand-800`}>
          {CATEGORY[incident.category] ?? incident.category}
        </span>
        <Nature nature={incident.nature} />
      </div>
      <p className="font-semibold">{incident.summary}</p>
      <p className="break-words">{incident.description}</p>
      <p className="text-ink-600">
        Happened {time(incident.occurredAt, timeZone)} · reported{' '}
        {time(incident.createdAt, timeZone)} · {who(incident.actorKind, incident.actorName, admin)}
      </p>
      <Photos items={incident.attachments} href={href} label={incident.reference} />
      {!open ? (
        <p className="rounded bg-ink-25 p-2">
          Closed {time(incident.closedAt, timeZone)}: {incident.resolutionNote}
        </p>
      ) : null}
      {admin && open ? (
        <CloseIncidentForm key={`${incident.id}-${incident.version}`} incident={incident} />
      ) : null}
    </li>
  );
}

/**
 * CP13 operational evidence for one visit: the transition evidence chain with
 * private photos and corrections, then visit-linked incidents.
 */
export function VisitEvidence({ visit, orderId, base, timeZone, admin = false, action = null }) {
  const href = (id) => `${base}/${orderId}/attachments/${id}`;
  const incidents = visit.incidents ?? [];
  return (
    <div className="space-y-3">
      {visit.evidence?.length ? (
        <ol className="space-y-2" aria-label={`Evidence for ${visit.reference}`}>
          {visit.evidence.map((item) => (
            <Evidence key={item.id} item={item} href={href} timeZone={timeZone} admin={admin} />
          ))}
        </ol>
      ) : null}
      {action}
      <section aria-label={`Incidents for ${visit.reference}`} className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-meta font-semibold">
          <ShieldAlert className="size-4 text-amber-700" aria-hidden="true" />
          Incidents ({incidents.length})
        </h4>
        {incidents.length ? (
          <ol className="space-y-2">
            {incidents.map((incident) => (
              <Incident
                key={incident.id}
                incident={incident}
                href={href}
                timeZone={timeZone}
                admin={admin}
              />
            ))}
          </ol>
        ) : null}
        {REPORTABLE.includes(visit.state) && visit.startsAt ? (
          <IncidentForm
            key={`${visit.id}-incidents-${incidents.length}`}
            visit={visit}
            requestKey={randomUUID()}
            admin={admin}
          />
        ) : null}
      </section>
    </div>
  );
}
