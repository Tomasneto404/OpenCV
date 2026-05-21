/**
 * Support page (route: /support — /verify is an alias).
 *
 * Flow:
 *   1. User drops a CVeaver PDF.
 *   2. We extract the embedded payload and ask the server to verify the
 *      Ed25519 signature.
 *   3. If valid → show signature details and a complaint form. The complaint
 *      form requires the submitter's email to match cv.personal.email — this
 *      keeps strangers from filing complaints on someone else's PDF.
 *   4. If invalid / unsigned → show a clear error and stop.
 *
 * The complaint POST hits /support; the server logs it and stores it in
 * data/complaints.json (see server/index.js).
 */
import { useRef, useState } from 'react';
import { loadConfigFromFile, ConfigLoadError } from '../utils/loadConfig';
import { verifyPdfPayload, submitComplaint } from '../api';
import { useT } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import type { CVData } from '../types';
import type { SignatureEnvelope } from '../utils/pdfEnhance';

interface Props { onBack: () => void; }

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'valid';    cv: CVData; signature: SignatureEnvelope; signedAt: string | null; keyId: string | null; hash: string | null }
  | { kind: 'invalid';  cv: CVData; signature?: SignatureEnvelope; reason: string }
  | { kind: 'unsigned'; cv: CVData }
  | { kind: 'error';    message: string };

export function Support({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { t, locale } = useT();

  /** Handle a dropped/picked file: extract → verify → set status accordingly. */
  const handleFile = async (file: File | null) => {
    if (!file) return;
    setStatus({ kind: 'busy' });
    try {
      const loaded = await loadConfigFromFile(file);
      if (loaded.source !== 'pdf') {
        setStatus({ kind: 'error', message: 'Carrega o PDF assinado, não o .json.' });
        return;
      }
      if (!loaded.signature) {
        setStatus({ kind: 'unsigned', cv: loaded.cv });
        return;
      }
      const result = await verifyPdfPayload(loaded.cv, loaded.signature);
      if (result.valid) {
        setStatus({
          kind: 'valid',
          cv: loaded.cv,
          signature: loaded.signature,
          signedAt: result.signedAt ?? null,
          keyId:    result.keyId    ?? null,
          hash:     result.hash     ?? null,
        });
      } else {
        setStatus({
          kind: 'invalid',
          cv: loaded.cv,
          signature: loaded.signature,
          reason: result.reason ?? 'unknown',
        });
      }
    } catch (err) {
      const msg = err instanceof ConfigLoadError ? err.message : (err as Error).message;
      setStatus({ kind: 'error', message: msg });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="min-h-screen">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-[color:var(--color-border)]">
        <button className="btn-ghost text-sm" onClick={onBack}>{t('support.navBack')}</button>
        <div className="flex items-center gap-3">
          <BrandMark withWordmark size={24} />
          <ThemeToggle />
        </div>
      </nav>

      <div className="px-6 py-12 max-w-2xl mx-auto">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('support.title')}</h1>
          <p className="mt-3 text-white/70 leading-relaxed">{t('support.subtitle')}</p>
        </header>

        <div
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragOver={(e)  => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={()  => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
          className={[
            'mt-10 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition',
            dragOver ? 'border-brand-400 bg-brand-500/10' : 'border-white/15 hover:border-white/30 bg-white/[0.02]',
          ].join(' ')}
        >
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <p className="text-lg font-medium">{t('support.drop')}</p>
          <p className="mt-1 text-sm text-white/55">{t('support.dropOr')}</p>
        </div>

        <div className="mt-8">
          <Result status={status} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function Result({ status, locale }: { status: Status; locale: string }) {
  const { t } = useT();
  if (status.kind === 'idle') return null;
  if (status.kind === 'busy') return <div className="text-center text-white/60">{t('support.verifying')}</div>;
  if (status.kind === 'error') {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm">
        <p className="font-semibold text-red-200">{t('support.errorTitle')}</p>
        <p className="mt-1 text-white/75">{status.message}</p>
      </div>
    );
  }
  if (status.kind === 'unsigned') {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm space-y-2">
        <p className="font-semibold text-amber-200">{t('support.unsignedTitle')}</p>
        <p className="text-white/75">{t('support.unsignedBody')}</p>
        <CvSummary cv={status.cv} />
      </div>
    );
  }
  if (status.kind === 'invalid') {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm space-y-2">
        <p className="font-semibold text-red-200">{t('support.invalidTitle')}</p>
        <p className="text-white/75">{t('support.invalidBody')}</p>
        <p className="text-xs text-white/45">{t('support.invalidReason', { reason: status.reason })}</p>
        <CvSummary cv={status.cv} />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm space-y-3">
        <div className="flex items-center gap-2 text-emerald-200">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/><path d="m9 12 2 2 4-4"/></svg>
          <p className="font-semibold">{t('support.validTitle')}</p>
        </div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[13px]">
          <dt className="text-white/50">{t('support.fields.author')}</dt>
          <dd className="text-white">{status.cv.personal.fullName || '—'}</dd>
          <dt className="text-white/50">{t('support.fields.template')}</dt>
          <dd className="text-white capitalize">{status.cv.template}</dd>
          <dt className="text-white/50">{t('support.fields.signedAt')}</dt>
          <dd className="text-white">{formatDate(status.signedAt, locale)}</dd>
          <dt className="text-white/50">{t('support.fields.keyId')}</dt>
          <dd className="text-white font-mono">{status.keyId}</dd>
          <dt className="text-white/50">{t('support.fields.hash')}</dt>
          <dd className="text-white font-mono break-all text-[11.5px]">{status.hash}</dd>
        </dl>
      </div>

      <ComplaintForm
        expectedEmail={status.cv.personal.email}
        keyId={status.keyId}
        hash={status.hash}
        signedAt={status.signedAt}
        author={status.cv.personal.fullName}
      />
    </div>
  );
}

function ComplaintForm({
  expectedEmail, keyId, hash, signedAt, author,
}: { expectedEmail: string; keyId: string | null; hash: string | null; signedAt: string | null; author: string }) {
  const { t } = useT();
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email || !subject || !message) {
      setError(t('support.complaint.missing'));
      return;
    }
    if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
      setError(t('support.complaint.emailMismatch'));
      return;
    }
    setBusy(true);
    try {
      await submitComplaint({ email, subject, message, keyId, hash, signedAt, author });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.07] p-5 text-sm space-y-1">
        <p className="font-semibold text-emerald-200">{t('support.complaint.submittedTitle')}</p>
        <p className="text-white/75">{t('support.complaint.submittedBody')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{t('support.complaint.title')}</h2>
        <p className="text-sm text-white/65">{t('support.complaint.subtitle')}</p>
      </div>

      <div>
        <label className="label">{t('support.complaint.email')}</label>
        <input className="field" type="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="mt-1 text-[11px] text-white/45">
          {t('support.complaint.emailHelp', { expected: expectedEmail || '—' })}
        </p>
      </div>

      <div>
        <label className="label">{t('support.complaint.subject')}</label>
        <input className="field" placeholder={t('support.complaint.subjectPh')}
          value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div>
        <label className="label">{t('support.complaint.message')}</label>
        <textarea className="field" rows={5} placeholder={t('support.complaint.messagePh')}
          value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      {error && <p className="text-[12.5px] text-red-300">{error}</p>}

      <div className="flex justify-end">
        <button type="button" className="btn-primary text-sm" onClick={onSubmit} disabled={busy}>
          {busy ? t('support.complaint.submitBusy') : t('support.complaint.submit')}
        </button>
      </div>
    </div>
  );
}

function CvSummary({ cv }: { cv: CVData }) {
  const { t } = useT();
  return (
    <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-[12.5px] mt-2 pt-2 border-t border-white/10">
      <dt className="text-white/45">{t('support.fields.author')}</dt>
      <dd className="text-white/80">{cv.personal.fullName || '—'}</dd>
      <dt className="text-white/45">{t('support.fields.template')}</dt>
      <dd className="text-white/80 capitalize">{cv.template}</dd>
    </dl>
  );
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  try {
    const tag = locale === 'pt' ? 'pt-PT' : locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    return new Date(iso).toLocaleString(tag);
  } catch { return iso; }
}
