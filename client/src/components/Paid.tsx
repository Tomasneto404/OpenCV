/**
 * Paid — the screen the user sees after Stripe Checkout returns success.
 *
 * Responsibilities:
 *   - Show the "payment confirmed" badge and the signature panel if signed.
 *   - Offer the PDF download (which goes through enhancePdf, attaching JSON +
 *     signature) and an optional separate JSON download.
 *   - Allow editing again without re-paying (within the same session).
 */
import { useState } from 'react';
import type { CVData } from '../types';
import type { SignatureEnvelope, PublicKeyInfo } from '../utils/pdfEnhance';
import { Preview } from './Preview';
import { generateCvPdf } from '../utils/pdf';
import { downloadConfig, slugify } from '../utils/download';
import { useToast } from './Toast';
import { useT } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  cv: CVData;
  signature?: SignatureEnvelope;
  publicKey?: PublicKeyInfo;
  onReset: () => void;
  onEditAgain: () => void;
}

export function Paid({ cv, signature, publicKey, onReset, onEditAgain }: Props) {
  const [pdfBusy,  setPdfBusy]  = useState(false);
  const [pdfDone,  setPdfDone]  = useState(false);
  const [jsonDone, setJsonDone] = useState(false);
  const toast = useToast();
  const { t } = useT();

  const baseName = slugify(cv.personal.fullName) || 'cv';
  const signed = Boolean(signature);

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      await generateCvPdf(cv, { filename: `${baseName}.pdf`, signature, publicKey });
      setPdfDone(true);
      toast.push({ kind: 'success', title: t('toast.pdfDoneTitle'), body: signed ? t('toast.pdfDoneSigned') : undefined });
    } catch (err) {
      toast.push({ kind: 'error', title: t('toast.pdfFailTitle'), body: (err as Error).message });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleJson = () => {
    downloadConfig(cv, `${baseName}-config.json`);
    setJsonDone(true);
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
            <button onClick={handleJson} className="btn-ghost w-full justify-center text-base py-3">
              {jsonDone ? t('paid.downloadJsonDone') : t('paid.downloadJson')}
            </button>
          </div>

          {signed && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 text-sm text-white/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/><path d="m9 12 2 2 4-4"/></svg>
                <span className="font-medium">{t('paid.signedTitle')}</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-white/65">
                {t('paid.signedBody')} <code className="bg-white/10 px-1 rounded">{signature!.keyId}</code>.
              </p>
              <p className="text-[11.5px] text-white/45 font-mono break-all">
                hash · {signature!.hash.slice(0, 32)}…
              </p>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 space-y-2">
            <p className="text-white font-medium text-sm">{t('paid.embedTitle')}</p>
            <p className="text-[12.5px] leading-relaxed">{t('paid.embedBody')}</p>
          </div>

          <button onClick={onEditAgain} className="text-sm text-white/50 hover:text-white/85 underline underline-offset-4">
            {t('paid.editAgain')}
          </button>
        </div>

        <div className="bg-black/30 rounded-2xl p-4 lg:p-6 overflow-auto max-h-[calc(100vh-160px)]">
          <Preview cv={cv} />
        </div>
      </div>
    </div>
  );
}
