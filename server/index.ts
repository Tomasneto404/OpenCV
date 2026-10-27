/** OpenCV API: free PDF export and reimport. CVs are processed in memory. */
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pLimit from 'p-limit';
import './env.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { renderPdf } from './pdf/render.ts';
import { readCVFromPdf, LegacyEncryptedPdfError } from './pdf/read.ts';
import { validateCV, safeFilename, safeErrorMessage } from './security.ts';

export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:'], workerSrc: ["'self'", 'blob:'],
    connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
    upgradeInsecureRequests: null,
  } },
}));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
const api = express.Router();
api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const limiter = (max: number) => rateLimit({ windowMs: 60_000, max, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados pedidos. Tenta novamente dentro de um minuto.' } });
const concurrency = Number(process.env.PDF_CONCURRENCY ?? 2);
const renderLimit = pLimit(Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 2);
api.get('/health', (_req, res) => res.json({ ok: true, service: 'opencv' }));
api.post('/pdf', limiter(12), express.json({ limit: '80mb' }), async (req, res) => {
  const cv = validateCV(req.body?.cv);
  if (!cv || !cv.personal.fullName.trim()) return res.status(400).json({ error: 'Preenche o nome e verifica os dados do CV.' });
  // Bound queued jobs as well as concurrent renders.
  if (renderLimit.pendingCount >= 8) return res.status(503).json({ error: 'O servidor está ocupado. Tenta novamente em instantes.' });
  try {
    const pdf = await renderLimit(() => renderPdf(cv));
    res.type('application/pdf').set('Content-Disposition', `attachment; filename="${safeFilename(cv.personal.fullName)}-cv.pdf"`).send(pdf);
  } catch (err) {
    console.error('[pdf]', safeErrorMessage(err));
    res.status(500).json({ error: 'Não foi possível gerar o PDF. Verifica os anexos e tenta novamente.' });
  }
});
api.post('/decode-pdf', limiter(15), express.raw({ type: 'application/pdf', limit: '80mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Missing PDF body' });
  try {
    const cv = await readCVFromPdf(req.body);
    if (!cv) return res.status(422).json({ error: 'Este PDF não contém dados editáveis OpenCV.' });
    res.json({ cv });
  } catch (error) {
    res.status(422).json({ error: error instanceof LegacyEncryptedPdfError ? error.message : 'Não foi possível ler este PDF.' });
  }
});
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
// Keep the development API URLs and Vite proxy compatible.
app.use('/', api);
app.get('/healthz', (_req, res) => res.type('text').send('ok'));
const staticDir = process.env.STATIC_DIR;
if (staticDir) {
  const directory = resolve(staticDir);
  app.use('/assets', express.static(resolve(directory, 'assets'), {
    maxAge: '1y', immutable: true, fallthrough: false,
    setHeaders: (res, path) => { if (path.endsWith('.mjs')) res.type('application/javascript'); },
  }));
  app.use(express.static(directory, { maxAge: 0 }));
  app.get(['/', '/builder', '/privacy', '/help'], (_req, res) => {
    res.set('Cache-Control', 'no-store').sendFile(resolve(directory, 'index.html'));
  });
}
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status === 413 ? 413 : err.status === 404 ? 404 : 400;
  res.status(status).json({ error: status === 413 ? 'O ficheiro é demasiado grande.' : 'Pedido inválido.' });
});
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`OpenCV API: http://localhost:${port}`));
}
