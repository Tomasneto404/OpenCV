/**
 * Paid — the screen the user sees after Stripe Checkout returns success.
 *
 * Responsibilities:
 *   - Confirm payment visually.
 *   - Trigger the server-side PDF download via /pdf/:sessionId. The server
 *     re-checks payment with Stripe before responding — this is the actual
 *     paywall. The server also emails the buyer (if Stripe collected an
 *     email) — no separate "send by email" button needed.
 *   - Show the rank badge (driven by editCount from the server response).
 *   - Allow editing again without re-paying within the same session.
 */
import { useState } from 'react';
import type { CVData, CVMeta } from '../types';
import { Preview } from './Preview';
import { downloadPaidPdf } from '../utils/pdf';
import { slugify } from '../utils/download';
import { useToast } from './Toast';
import { useT } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { Badge } from './Badge';

interface Props {
  cv: CVData;
  sessionId?: string;
  cvId?: string;
  /** Meta from the uploaded prev PDF, if any. Replaced by server response after download. */
  initialMeta?: CVMeta;
  onMetaUpdate: (meta: CVMeta) => void;
  onReset: () => void;
  onEditAgain: () => void;
}

export function Paid({ cv, sessionId, cvId, initialMeta, onMetaUpdate, onReset, onEditAgain }: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [meta,    setMeta]    = useState<CVMeta | undefined>(initialMeta);
  const toast = useToast();
  const { t } = useT();

  const baseName = slugify(cv.personal.fullName) || 'cv';

  const handlePdf = async () => {
    if (!sessionId || !cvId) {
      toast.push({ kind: 'error', title: t('toast.pdfFailTitle'), body: 'Missing payment context.' });
      return;
    }
    setPdfBusy(true);
    try {
      const { meta: serverMeta } = await downloadPaidPdf(sessionId, cvId, { filename: `${baseName}.pdf` });
      setPdfDone(true);
      if (serverMeta) {
        setMeta(serverMeta);
        onMetaUpdate(serverMeta);
      }
      toast.push({
        kind: 'success',
        title: t('toast.pdfDoneTitle'),
        body: serverMeta?.lastSentEmail
          ? t('toast.emailSent', { email: serverMeta.lastSentEmail })
          : undefined,
      });
    } catch (err) {
      toast.push({ kind: 'error', title: t('toast.pdfFailTitle'), body: (err as Error).message });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-[color:var(--color-border)]">
        <BrandMark withWordmark size={24} />
        <div className="flex items-center gap-3">
          <button className="btn-ghost text-sm" onClick={onReset}>{t('paid.startOther')}</button>
          <ThemeToggle />
        </div>
      </nav>

      <div className="px-6 py-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 text-xs text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('paid.confirmed')}
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            {t('paid.title')}
          </h1>
          <p className="text-white/65 leading-relaxed">{t('paid.subtitle')}</p>

          <div className="space-y-3 pt-2">
            <button onClick={handlePdf} disabled={pdfBusy} className="btn-primary w-full justify-center text-base py-3">
              {pdfBusy ? t('paid.downloadPdfBusy') : pdfDone ? t('paid.downloadPdfDone') : t('paid.downloadPdf')}
            </button>
            {meta?.lastSentEmail && pdfDone && (
              <p className="text-[12.5px] text-[color:var(--color-ink-muted)] text-center">
                {t('paid.emailSent', { email: meta.lastSentEmail })}
              </p>
            )}
          </div>

          {meta && <Badge meta={meta} />}

          <button onClick={onEditAgain} className="text-sm text-white/50 hover:text-white/85 underline underline-offset-4">
            {t('paid.editAgain')}
          </button>
        </div>

        <div className="bg-black/30 rounded-2xl p-4 lg:p-6 overflow-auto max-h-[calc(100vh-160px)]">
          <Preview cv={cv} paid />
        </div>
      </div>
    </div>
  );
}
