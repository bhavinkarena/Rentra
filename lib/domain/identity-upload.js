import { encodePhoto, PHOTO_TYPES } from './photo-upload';

/** Prepare privately in the browser; only the compressed file reaches the action. */
export async function prepareIdentityFile(
  file,
  { longEdge = 2000, quality = 0.85, allowPdf = true } = {},
) {
  if (allowPdf && file.type === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a PDF under 5MB.');
    return { file, preview: null };
  }
  if (!PHOTO_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG, WEBP or PDF.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo under 25MB.');
  const prepared = await encodePhoto(file, { longEdge, quality });
  if (prepared.size > 5 * 1024 * 1024)
    throw new Error('This photo could not be prepared. Choose a smaller photo.');
  const preview = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(prepared);
  });
  return { file: prepared, preview };
}
