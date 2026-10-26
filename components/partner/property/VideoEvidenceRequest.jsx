'use client';

import { useState } from 'react';
import { propertyEvidenceCommand } from '@/lib/actions/partner';

const megabytes = (bytes) => Math.round(bytes / 1024 / 1024);
// A dropped connection to the app server throws; treat it like any refused command.
const command = (...args) =>
  propertyEvidenceCommand(...args).catch(() => ({
    error: 'Rentra could not be reached. Check your connection and try again.',
  }));

/** Browser upload straight to private storage, with progress. Resolves on HTTP 2xx only. */
function send(upload, file, onProgress) {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    for (const [name, value] of Object.entries(upload.fields)) body.set(name, String(value));
    body.set('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', upload.url);
    xhr.upload.onprogress = (event) =>
      event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
    xhr.onerror = reject;
    xhr.send(body);
  });
}

/**
 * Story 1.3: one open property-video request. Choosing and uploading a file is
 * separate from sending it to Rentra, and nothing here resubmits the property.
 */
function OpenRequest({ id, request, limits }) {
  const [phase, setPhase] = useState(request.state === 'uploaded' ? 'uploaded' : 'idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [publicId, setPublicId] = useState(request.video?.ref ?? '');
  const formats = limits.formats.map((f) => f.toUpperCase()).join(' or ');

  async function upload(file) {
    setError('');
    // Quick hint only; the server checks the stored file itself.
    if (file.size > limits.maxBytes) {
      setError(`This video is larger than ${megabytes(limits.maxBytes)} MB. Choose a shorter one.`);
      return;
    }
    setPhase('uploading');
    setProgress(0);
    const signed = await command(id, request.id, 'sign');
    if (signed.error) {
      setPhase('idle');
      setError(signed.error);
      return;
    }
    try {
      await send(signed.upload, file, setProgress);
    } catch {
      setPhase('idle');
      setError('The upload did not finish. Check your connection and choose the video again.');
      return;
    }
    const confirmed = await command(id, request.id, 'confirm', signed.publicId);
    if (confirmed.error) {
      setPhase('idle');
      setError(confirmed.errors?.video ?? confirmed.error);
      return;
    }
    setPublicId(signed.publicId);
    setPhase('uploaded');
  }

  async function submit() {
    setError('');
    setPhase('sending');
    const result = await command(id, request.id, 'submit', publicId);
    if (result.error) {
      setPhase('uploaded');
      setError(result.error);
      return;
    }
    setPhase('sent');
  }

  if (phase === 'sent')
    return (
      <p role="status" className="text-meta text-brand-900">
        Video sent to Rentra. A reviewer will look at it; this does not change your property’s
        review on its own.
      </p>
    );
  return (
    <div className="space-y-3">
      <p className="text-body text-ink-800">Rentra asked for a short video of this property:</p>
      <blockquote className="whitespace-pre-wrap border-l-2 border-ink-200 pl-3 text-meta">
        {request.reason}
      </blockquote>
      <p className="text-meta text-ink-600">
        {formats} video, up to {megabytes(limits.maxBytes)} MB. The video is private: only Rentra
        reviewers can watch it.
      </p>
      <label className="block text-meta font-semibold text-ink-700">
        {phase === 'uploaded' ? 'Replace the video' : 'Choose a video'}
        <input
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          disabled={phase === 'uploading' || phase === 'sending'}
          onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}
          className="mt-1 block w-full text-meta file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-card file:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        />
      </label>
      {phase === 'uploading' ? (
        <p role="status" className="text-meta">
          Uploading… {progress}% — not sent to Rentra yet.
        </p>
      ) : null}
      {phase === 'uploaded' && publicId ? (
        <p role="status" className="text-meta">
          Uploaded. Not sent yet — press Send video to Rentra.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={submit}
        disabled={!(phase === 'uploaded' && publicId)}
        className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-meta font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {phase === 'sending' ? 'Sending…' : 'Send video to Rentra'}
      </button>
    </div>
  );
}

export default function VideoEvidenceRequest({ id, evidence }) {
  if (!evidence?.requests?.length) return null;
  const open = evidence.requests.find((r) => r.state !== 'submitted');
  const sent = evidence.requests.filter((r) => r.state === 'submitted');
  return (
    <section
      aria-labelledby="video-evidence-title"
      className="mt-5 rounded-lg border border-border bg-card p-5"
    >
      <h2 id="video-evidence-title" className="text-h4 font-semibold">
        Property video
      </h2>
      <div className="mt-3 space-y-4">
        {open ? (
          evidence.enabled ? (
            <OpenRequest id={id} request={open} limits={evidence.limits} />
          ) : (
            <p className="text-meta text-ink-700">
              Rentra asked for a property video. Video upload is not available yet; Rentra will
              contact you.
            </p>
          )
        ) : null}
        {sent.length ? (
          <ul role="status" className="space-y-1 text-meta text-ink-600">
            {sent.map((r) => (
              <li key={r.id}>
                Video sent to Rentra on{' '}
                {new Date(r.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}. A
                reviewer will look at it; this does not change your property’s review on its own.
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
