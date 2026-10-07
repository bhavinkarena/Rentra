export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Re-encode a photo in the browser as WebP: full detail up to `longEdge`,
 * a fraction of the bytes, and no camera metadata (GPS, device) since only
 * pixels survive the canvas. Browsers that cannot encode WebP get JPEG.
 */
export async function encodePhoto(file, { longEdge = 2560, quality = 0.82 } = {}) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, longEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (blob?.type !== 'image/webp') {
      // JPEG has no transparency: paint white behind it, not black.
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, 'image/jpeg', quality);
    }
    if (!blob) throw new Error('This photo could not be prepared. Choose another photo.');
    // Never make an already-small photo bigger.
    if (scale === 1 && file.size <= blob.size) return file;
    const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + ext, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

/**
 * onChange for a plain `<input type="file">`: swaps the chosen photos for
 * WebP versions in place, so the form submits them unchanged. The input is
 * invalid while preparing, which blocks an early submit. Non-photos (PDF)
 * pass through. Returns the prepared files, or null if the pick changed.
 */
export async function preparePhotoInput(event, options) {
  const input = event.currentTarget ?? event.target;
  const files = [...input.files];
  const photos = files.some((f) => PHOTO_TYPES.includes(f.type));
  input.setCustomValidity(photos ? 'Preparing photos…' : '');
  if (!photos) return files;
  const prepared = await Promise.all(
    files.map((f) => (PHOTO_TYPES.includes(f.type) ? encodePhoto(f, options).catch(() => f) : f)),
  );
  if (input.files[0] !== files[0]) return null;
  const transfer = new DataTransfer();
  prepared.forEach((f) => transfer.items.add(f));
  input.files = transfer.files;
  input.setCustomValidity('');
  return prepared;
}
