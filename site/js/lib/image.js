/* Resize an image in the browser and return a JPEG blob. Used for avatars, event banners and article covers. */
export async function toJpeg(file, max = 512) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { const e = new Error('type'); e.userMessage = 'Please choose a JPG, PNG or WebP image.'; throw e; }
  if (file.size > 15 * 1024 * 1024) { const e = new Error('size'); e.userMessage = 'That image is too large. Choose one under 15 MB.'; throw e; }
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { const e = new Error('decode'); e.userMessage = 'That image could not be read.'; throw e; }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85));
}
