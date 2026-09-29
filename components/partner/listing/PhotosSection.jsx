'use client';
import Loader2 from '@/components/ui/rentra-loader';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Trash2, Upload, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  uploadListingPhotos,
  removeListingPhoto,
  reorderListingPhotos,
} from '@/lib/actions/partner';
import { MIN_PHOTOS, MAX_PHOTOS } from '@/lib/domain/listing-completion';
import { photoId } from '@/lib/domain/listing-photos';
import { VersionField, Section, SaveButton } from './SectionPrimitives';
export function PhotosSection({ listing, photos }) {
  const [state, action, pending] = useActionState(uploadListingPhotos, {});
  const [removeState, removeAction, removing] = useActionState(removeListingPhoto, {});
  const [orderState, orderAction, ordering] = useActionState(reorderListingPhotos, {});
  const e = state.errors ?? {};
  const busy = removing || ordering;

  const inputRef = useRef(null);
  const formRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState([]);

  const room = MAX_PHOTOS - photos.length;
  const short = Math.max(0, MIN_PHOTOS - photos.length);

  // Object URLs are a leak if they are not handed back. The cleanup revokes
  // the previous batch whenever `staged` is replaced, and the last one on
  // unmount.
  useEffect(() => () => staged.forEach((f) => URL.revokeObjectURL(f.url)), [staged]);

  /**
   * Drop the previews the moment the upload settles — adjusting state during
   * render, which is React's documented way to react to a changed prop
   * without the cascading re-render an effect would cause here.
   *
   * Keyed on `pending` falling rather than on success, because a REJECTED
   * upload (over 2MB, wrong type) also has to clear them. Keyed on success
   * alone, a rejected batch would spin under its own thumbnails forever.
   */
  const [wasPending, setWasPending] = useState(false);
  if (pending !== wasPending) {
    setWasPending(pending);
    if (!pending && staged.length) setStaged([]);
  }

  function accept(fileList) {
    const files = Array.from(fileList ?? []).slice(0, room);
    if (!files.length) return;

    // Assigning to input.files needs a DataTransfer — it is the only way to
    // put dropped files into a form control the Server Action can read.
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;

    setStaged(files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })));
    formRef.current?.requestSubmit();
  }

  const Move = ({ photoKey, move, label, disabled, children }) => (
    <form action={orderAction}>
      <input type="hidden" name="id" value={listing.id} />
      <input type="hidden" name="key" value={photoKey} />
      <input type="hidden" name="move" value={move} />
      <button
        type="submit"
        disabled={disabled || busy}
        aria-label={label}
        title={label}
        className="grid size-11 place-items-center rounded-full bg-white md:size-8 text-ink-600 shadow-sm transition-colors hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-0"
      >
        {children}
      </button>
    </form>
  );

  return (
    <Section
      id="photos"
      title="Photos"
      intro="Six or more, of this property as it actually is. We reverse-image check them."
      state={state}
      pending={pending}
    >
      {removeState.errors?._ || orderState.errors?._ ? (
        <p className="rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
          {removeState.errors?._ ?? orderState.errors?._}
        </p>
      ) : null}

      {/* ------------------------- progress ------------------------- */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              photos.length >= MIN_PHOTOS ? 'bg-brand-600' : 'bg-warning'
            }`}
            style={{ width: `${Math.min(100, (photos.length / MIN_PHOTOS) * 100)}%` }}
          />
        </div>
        <p className="shrink-0 text-tiny font-semibold tabular text-ink-600">
          {photos.length >= MIN_PHOTOS
            ? `${photos.length} photos`
            : `${photos.length} of ${MIN_PHOTOS}`}
        </p>
      </div>
      {short > 0 ? (
        <p className="text-tiny text-ink-500">
          {short} more and this step is done. {room} slots left in total.
        </p>
      ) : null}

      {/* ------------------------- the grid ------------------------- */}
      {photos.length > 0 || staged.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li
              key={photoId(p)}
              className={`group relative animate-in fade-in zoom-in-95 overflow-hidden rounded-lg border bg-ink-50 duration-300 ${
                i === 0 ? 'border-brand-600 ring-2 ring-brand-600/30' : 'border-border'
              }`}
            >
              {/* Listing photos live in the same private store as documents for
                  now, so they are described rather than rendered until a public
                  delivery bucket exists. */}
              <div className="grid aspect-4/3 place-items-center p-2 text-center text-tiny text-ink-500">
                Photo {i + 1}
              </div>

              {i === 0 ? (
                <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-tiny font-bold text-white">
                  Cover
                </span>
              ) : null}

              {/* Controls fade in on hover, and are always visible on touch,
                  where there is no hover to fade from. */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {i > 0 ? (
                  <Move photoKey={photoId(p)} move="cover" label={`Make photo ${i + 1} the cover`}>
                    <Star className="size-4" aria-hidden="true" />
                  </Move>
                ) : null}
                <form action={removeAction}>
                  <input type="hidden" name="id" value={listing.id} />
                  <VersionField listing={listing} states={[state, removeState]} />
                  <input type="hidden" name="key" value={photoId(p)} />
                  <button
                    type="submit"
                    disabled={busy}
                    aria-label={`Remove photo ${i + 1}`}
                    className="grid size-11 place-items-center rounded-full bg-white md:size-8 text-ink-600 shadow-sm transition-colors hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </div>

              <div className="absolute bottom-2 left-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <Move
                  photoKey={photoId(p)}
                  move="back"
                  disabled={i === 0}
                  label={`Move photo ${i + 1} earlier`}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Move>
                <Move
                  photoKey={photoId(p)}
                  move="forward"
                  disabled={i === photos.length - 1}
                  label={`Move photo ${i + 1} later`}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Move>
              </div>
            </li>
          ))}

          {/* Optimistic tiles: the real thumbnail, on screen before the upload
              finishes, so a slow connection shows progress instead of nothing. */}
          {staged.map((f) => (
            <li
              key={f.url}
              className="relative animate-in fade-in zoom-in-95 overflow-hidden rounded-lg border border-dashed border-brand-400 duration-300"
            >
              {/* Deliberately not next/image: this is a local blob: URL for a
                  file that has not been uploaded yet. There is nothing on a
                  CDN to optimise, and the optimiser cannot read a blob. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="aspect-4/3 w-full object-cover opacity-60" />
              <span className="absolute inset-0 grid place-items-center bg-white/60">
                <Loader2 className="size-5  text-brand-700" aria-hidden="true" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {photos.length > 1 ? (
        <p className="text-tiny text-ink-500">
          The cover is what guests see in search and on WhatsApp. Reordering never sends a live
          listing back for review — adding or removing a photo does.
        </p>
      ) : null}

      {/* ------------------------- the dropzone ------------------------- */}
      <form ref={formRef} action={action} className="space-y-3">
        <input type="hidden" name="id" value={listing.id} />
        <VersionField listing={listing} states={[state, removeState]} />

        {room > 0 ? (
          <label
            htmlFor="photo-files"
            onDragOver={(ev) => {
              ev.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(ev) => {
              ev.preventDefault();
              setDragging(false);
              accept(ev.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-[background-color,color,border-color,box-shadow,transform] duration-200 ${
              dragging
                ? 'scale-[1.01] border-brand-600 bg-brand-50'
                : e.photos
                  ? 'border-danger/50 bg-danger-bg'
                  : 'border-input hover:border-brand-400 hover:bg-brand-50/40'
            }`}
          >
            <span
              className={`grid size-12 place-items-center rounded-full transition-transform duration-200 ${
                dragging ? 'bg-primary text-primary-foreground' : 'bg-ink-100 text-ink-600'
              }`}
            >
              {pending ? (
                <Loader2 className="size-5 " aria-hidden="true" />
              ) : (
                <Upload className="size-5" aria-hidden="true" />
              )}
            </span>
            <span className="text-body font-semibold text-ink-900">
              {pending ? (
                <span className="sr-only">Uploading…</span>
              ) : dragging ? (
                'Drop them here'
              ) : (
                'Add photos'
              )}
            </span>
            <span className="text-tiny text-ink-500">
              Tap to choose, or drag them in · JPG, PNG or WEBP · up to 2MB each · {room} more
              allowed
            </span>
          </label>
        ) : (
          <p className="rounded-xl border border-border bg-ink-50 p-4 text-center text-meta text-ink-600">
            That is the maximum of {MAX_PHOTOS} photos. Remove one to add another.
          </p>
        )}

        <input
          ref={inputRef}
          id="photo-files"
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(ev) => accept(ev.target.files)}
        />
        {e.photos ? <p className="text-tiny font-medium text-danger">{e.photos}</p> : null}

        {/* Fallback only: with JavaScript the selection uploads itself. */}
        <noscript>
          <SaveButton pending={pending} label="Upload" />
        </noscript>
      </form>
    </Section>
  );
}

/* ------------------------------- ownership ------------------------------- */
