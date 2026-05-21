const MAX_DIM = 480;
const JPEG_QUALITY = 0.85;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

export interface PhotoResult {
  dataUrl: string;       // image/jpeg base64
  width: number;
  height: number;
  bytes: number;
}

export type PhotoErrorCode = 'too-large' | 'not-image' | 'decode-failed';

export class PhotoError extends Error {
  code: PhotoErrorCode;
  constructor(code: PhotoErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Read a user-picked image, downscale to MAX_DIM (longest side, square-centre crop),
 * and return a clean JPEG data URL safe to embed in react-pdf and localStorage.
 */
export async function processPhoto(file: File): Promise<PhotoResult> {
  if (!file.type.startsWith('image/')) {
    throw new PhotoError('not-image', 'Escolhe um ficheiro de imagem (JPG, PNG, WebP).');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new PhotoError('too-large', 'Imagem demasiado grande (máx 8 MB).');
  }

  const bitmap = await loadBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const target = Math.min(MAX_DIM, side);

  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoError('decode-failed', 'Falha a processar a imagem.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target, target);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return {
    dataUrl,
    width: target,
    height: target,
    bytes: Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4),
  };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* fallthrough */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new PhotoError('decode-failed', 'Não consegui ler a imagem.')); };
    img.src = url;
  });
}
