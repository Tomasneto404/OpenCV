/**
 * Render a thumbnail of page 1 of a PDF as a data URL (PNG).
 *
 * Uses pdfjs-dist (lazy-loaded). The worker URL is wired through Vite's
 * `?url` import — Vite emits the worker file as a separate static asset.
 *
 * Returns null on failure (encrypted PDF, malformed bytes, worker init
 * failure, etc.). Caller should fall back to a static placeholder.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';

const THUMBNAIL_TARGET_WIDTH = 720;

let pdfjsLib: typeof import('pdfjs-dist') | null = null;
let initPromise: Promise<typeof import('pdfjs-dist') | null> | null = null;

async function ensurePdfjs(): Promise<typeof import('pdfjs-dist') | null> {
  if (pdfjsLib) return pdfjsLib;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const lib = await import('pdfjs-dist');
      const workerMod = await import('pdfjs-dist/build/pdf.worker.mjs?url');
      lib.GlobalWorkerOptions.workerSrc = workerMod.default;
      pdfjsLib = lib;
      return lib;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[pdfThumbnail] init failed:', (err as Error).message);
      return null;
    }
  })();
  return initPromise;
}

export interface ThumbnailResult {
  dataUrl: string;
  width: number;
  height: number;
}

export async function renderPdfThumbnail(bytes: Uint8Array): Promise<ThumbnailResult | null> {
  const lib = await ensurePdfjs();
  if (!lib) return null;

  try {
    // pdfjs may transfer the underlying buffer; copy into a fresh one to
    // avoid "detached ArrayBuffer" errors if we call this twice with the
    // same source bytes.
    const buf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buf).set(bytes);

    const loadingTask = lib.getDocument({ data: buf, disableAutoFetch: true, disableStream: true });
    const doc: PDFDocumentProxy = await loadingTask.promise;
    const page = await doc.getPage(1);

    const viewport0 = page.getViewport({ scale: 1 });
    const scale = THUMBNAIL_TARGET_WIDTH / viewport0.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width  = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[pdfThumbnail] 2D context unavailable');
      return null;
    }

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    await doc.cleanup();
    await doc.destroy();

    return { dataUrl, width: canvas.width, height: canvas.height };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pdfThumbnail] render failed:', (err as Error).message);
    return null;
  }
}
