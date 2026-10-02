/** Prepare privately in the browser; only the compressed file reaches the action. */
export async function prepareIdentityFile(file) {
  if (file.type === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a PDF under 5MB.');
    return { file, preview: null };
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPG, PNG, WEBP or PDF.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo under 25MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob || blob.size > 5 * 1024 * 1024)
      throw new Error('This photo could not be prepared. Choose a smaller photo.');
    return {
      file: new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }),
      preview: canvas.toDataURL('image/jpeg', 0.8),
    };
  } finally {
    bitmap.close();
  }
}
