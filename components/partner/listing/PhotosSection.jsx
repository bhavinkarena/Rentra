'use client';
import toast from 'react-hot-toast';
/* eslint-disable @next/next/no-img-element -- Cloudinary thumbnails and local blob previews. */
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signPropertyPhoto,
  attachPropertyPhoto,
  removeListingPhoto,
  reorderListingPhotos,
} from '@/lib/actions/partner';
import { prepareIdentityFile } from '@/lib/domain/identity-upload';
import { publicPhotoUrl } from '@/lib/domain/listing-content';
import { photoId } from '@/lib/domain/listing-photos';
import { Section } from './SectionPrimitives';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { REVIEWED_STATUSES } from '@/lib/domain/listing-trust';
import { useChrome } from './chrome';
const message = (result) =>
  result.error ||
  Object.values(result.errors || {})
    .flat()
    .join(' ');
export function PhotosSection({ listing, photos = [] }) {
  const router = useRouter(),
    version = useRef(listing.contentVersion),
    attachQueue = useRef(Promise.resolve()),
    requests = useRef(new Set()),
    urls = useRef(new Set()),
    drag = useRef(null);
  // PROP-03 / LIST-05: removing asks first; adding to a published property warns about review.
  const [ask, setAsk] = useState(null);
  const reviewed = REVIEWED_STATUSES.includes(listing.status);
  const [tiles, setTiles] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [tag, setTag] = useState('Other');
  const { onPending } = useChrome();
  const uploading = tiles.some((t) => t.status === 'uploading' || t.status === 'queued');
  useEffect(() => {
    onPending?.(uploading || busy);
    window.rentraUploadPending = uploading || busy;
    return () => {
      window.rentraUploadPending = false;
    };
  }, [onPending, uploading, busy]);
  useEffect(
    () => () => {
      requests.current.forEach((x) => x.abort());
      urls.current.forEach(URL.revokeObjectURL);
    },
    [],
  );
  const update = (id, patch) =>
    setTiles((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  async function upload(tile) {
    update(tile.id, { status: 'uploading', error: '' });
    try {
      const prepared = await prepareIdentityFile(tile.file, {
        longEdge: 2560,
        quality: 0.82,
        allowPdf: false,
      });
      const digest = await crypto.subtle.digest('SHA-256', await prepared.file.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, '0')).join(
        '',
      );
      const signed = await signPropertyPhoto(listing.id);
      if (message(signed)) throw new Error(message(signed));
      const data = new FormData();
      Object.entries(signed)
        .filter(([k]) => k !== 'cloudName')
        .forEach(([k, v]) => data.append(k, String(v)));
      data.append('file', prepared.file);
      const asset = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        requests.current.add(xhr);
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            update(tile.id, { progress: Math.round((e.loaded / e.total) * 100) });
        };
        xhr.onload = () => {
          requests.current.delete(xhr);
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error('Upload failed. Retry this photo.'));
        };
        xhr.onerror = xhr.onabort = () => {
          requests.current.delete(xhr);
          reject(new Error('Connection lost. Retry when connected.'));
        };
        xhr.send(data);
      });
      const apply = attachQueue.current
        .catch(() => {})
        .then(async () => {
          const result = await attachPropertyPhoto(listing.id, {
            publicId: asset.public_id,
            contentVersion: version.current,
            hash,
            tag: tile.tag,
          });
          if (message(result)) throw new Error(message(result));
          version.current = result.contentVersion;
          update(
            tile.id,
            result.duplicate
              ? { status: 'duplicate', error: 'Already added' }
              : { status: 'done', progress: 100 },
          );
          router.refresh();
        });
      attachQueue.current = apply;
      await apply;
    } catch (e) {
      update(tile.id, {
        status: 'error',
        error: /heic/i.test(tile.file.type)
          ? 'Change your iPhone camera to Most Compatible, then choose a JPG.'
          : e.message,
      });
    }
  }
  async function accept(files) {
    const available =
      15 - photos.length - tiles.filter((t) => ['queued', 'uploading'].includes(t.status)).length;
    const batch = Array.from(files)
      .slice(0, Math.max(0, available))
      .map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return { id: crypto.randomUUID(), file, url, tag, status: 'queued', progress: 0 };
      });
    setTiles((current) => [...current, ...batch]);
    const queue = [...batch];
    await Promise.all(
      [0, 1, 2].map(async () => {
        while (queue.length) await upload(queue.shift());
      }),
    );
  }
  async function mutate(action, input, offerUndo = true) {
    const previousPosition = photos.findIndex((photo) => photoId(photo) === input.key);
    setBusy(true);
    setError('');
    const form = new FormData();
    Object.entries({
      id: listing.id,
      contentVersion: Math.max(version.current || 0, listing.contentVersion || 0),
      ...input,
    }).forEach(([k, v]) => form.set(k, String(v)));
    try {
      const result = await action({}, form);
      if (message(result)) setError(message(result));
      else {
        version.current = result.contentVersion || version.current;
        if (action === reorderListingPhotos && offerUndo && previousPosition >= 0)
          toast.success(
            (t) => (
              <span>
                Photo order saved.{' '}
                <button
                  type="button"
                  className="min-h-11 underline"
                  onClick={() => {
                    toast.dismiss(t.id);
                    void mutate(
                      reorderListingPhotos,
                      { key: input.key, move: String(previousPosition) },
                      false,
                    );
                  }}
                >
                  Undo
                </button>
              </span>
            ),
            { duration: 10000 },
          );
        else toast.success(action === removeListingPhoto ? 'Photo removed.' : 'Photo order saved.');
        router.refresh();
      }
    } catch {
      setError('Could not save the photo change. Try again.');
    } finally {
      setBusy(false);
    }
  }
  const shown = tiles.filter((t) => t.status !== 'done');
  return (
    <Section
      id="photos"
      title="Photos"
      intro="Add at least six photos of the actual property. Choose a cover, then show the spaces guests will use."
    >
      <p role="status" className="text-meta">
        {photos.length} of 6 minimum · {photos.length} of 15 maximum
      </p>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, i) => {
          const url = publicPhotoUrl(photo, {
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          });
          return (
            <li
              key={photoId(photo)}
              className="overflow-hidden rounded-md border bg-card"
              data-photo-index={i}
              onPointerDown={(e) => {
                if (!busy && !uploading && !e.target.closest('button'))
                  drag.current = { key: photoId(photo), x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                const from = drag.current;
                drag.current = null;
                if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) < 20) return;
                const tile = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest('[data-photo-index]');
                if (tile && from.key !== photoId(photos[Number(tile.dataset.photoIndex)]))
                  mutate(reorderListingPhotos, { key: from.key, move: tile.dataset.photoIndex });
              }}
              draggable={!busy && !uploading}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', photoId(photo))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const key = e.dataTransfer.getData('text/plain');
                if (key !== photoId(photo)) mutate(reorderListingPhotos, { key, move: String(i) });
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (
                  !busy &&
                  !uploading &&
                  e.target === e.currentTarget &&
                  ['ArrowLeft', 'ArrowRight'].includes(e.key)
                ) {
                  e.preventDefault();
                  mutate(reorderListingPhotos, {
                    key: photoId(photo),
                    move: e.key === 'ArrowLeft' ? 'back' : 'forward',
                  });
                }
              }}
              aria-label={`Photo ${i + 1}; arrow keys reorder`}
            >
              {url ? (
                <img
                  src={url.replace(
                    '/image/upload/',
                    '/image/upload/c_fill,w_400,h_300,f_auto,q_auto,fl_strip_profile/',
                  )}
                  alt={photo.alt || `Property photo ${i + 1}`}
                  className="aspect-4/3 w-full object-cover"
                />
              ) : (
                <p className="grid aspect-4/3 place-items-center">Photo unavailable</p>
              )}
              <p className="px-2 text-tiny">{i === 0 ? 'Cover' : photo.tag || 'Other'}</p>
              <div className="flex flex-wrap items-center gap-x-3 px-2 pb-1">
                {i > 0 && (
                  <button
                    className="min-h-11 underline"
                    disabled={busy || uploading}
                    onClick={() =>
                      mutate(reorderListingPhotos, { key: photoId(photo), move: 'cover' })
                    }
                  >
                    Make cover
                  </button>
                )}
                <button
                  className="min-h-11 underline"
                  disabled={busy || uploading}
                  onClick={() => setAsk({ kind: 'remove', key: photoId(photo) })}
                >
                  Remove
                </button>
                <button
                  aria-label={`Move photo ${i + 1} earlier`}
                  className="min-h-11 min-w-11"
                  disabled={i === 0 || busy || uploading}
                  onClick={() =>
                    mutate(reorderListingPhotos, { key: photoId(photo), move: 'back' })
                  }
                >
                  ←
                </button>
                <button
                  aria-label={`Move photo ${i + 1} later`}
                  className="min-h-11 min-w-11"
                  disabled={i === photos.length - 1 || busy || uploading}
                  onClick={() =>
                    mutate(reorderListingPhotos, { key: photoId(photo), move: 'forward' })
                  }
                >
                  →
                </button>
              </div>
            </li>
          );
        })}
        {shown.map((tile) => (
          <li key={tile.id} className="rounded-md border p-2">
            <img src={tile.url} alt="Selected photo" className="aspect-4/3 w-full object-cover" />
            <p aria-live="polite" className="text-meta">
              {tile.error || `${tile.status} ${tile.progress}%`}
            </p>
            {tile.status === 'error' && (
              <button className="min-h-11 underline" onClick={() => upload(tile)}>
                Retry photo
              </button>
            )}
          </li>
        ))}
      </ul>
      <label className="block text-meta">
        Photo prompt
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="min-h-11 rounded-md border p-2"
        >
          {(listing.rentalUnit === 'hour'
            ? ['Court', 'Floodlights', 'Washroom', 'Other']
            : ['Pool', 'Lawn', 'Rooms', 'Kitchen', 'Night view', 'Other']
          ).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block min-h-11 rounded-md border border-dashed p-4">
        Add photos
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          disabled={uploading || photos.length >= 15}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (reviewed && files.length) setAsk({ kind: 'add', files });
            else accept(files);
          }}
          className="mt-2 block w-full"
        />
      </label>
      {photos.length >= 15 && <p>15 of 15 — remove one to add another.</p>}
      <ConfirmDialog
        open={Boolean(ask)}
        title={ask?.kind === 'add' ? 'New photos need a quick review' : 'Remove this photo?'}
        confirmLabel={ask?.kind === 'add' ? 'Add and send for review' : 'Remove photo'}
        danger={ask?.kind === 'remove'}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          const current = ask;
          setAsk(null);
          if (current?.kind === 'add') accept(current.files);
          else if (current) mutate(removeListingPhoto, { key: current.key });
        }}
      >
        <p>
          {ask?.kind === 'add'
            ? 'Rentra checks new photos before guests see them. Your property is hidden until then, usually within 1 working day.'
            : photos.length <= 6
              ? 'You need at least six photos to submit. Removing a photo never sends a live property for review.'
              : 'Removing a photo never sends a live property for review.'}
        </p>
      </ConfirmDialog>
    </Section>
  );
}
