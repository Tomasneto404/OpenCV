/**
 * Support page (route: /support — /verify is an alias).
 *
 * Simplified in Sessão 22 — no signature/keyId/hash exposed. The user
 * drops a PDF and sees a boolean: "verified" (can open complaint) or
 * "not verified" (stop). Internally the server runs Ed25519 verification
 * over the encrypted payload, but the result that leaves the server is
 * only `{ valid: true|false }`.
 *
 *   1. User drops a PDF.
 *   2. Server decrypts the embedded payload and verifies the internal
 *      signature against the CV body.
 *   3. If valid → show the complaint form. The submitter's email must
 *      match cv.personal.email so a stranger can't file a complaint on
 *      someone else's CV.
 *   4. If not valid → show a clean error and stop.
 */
import { useRef, useState } from 'react';
import { loadConfigFromFile, ConfigLoadError } from '../utils/loadConfig';
import { submitComplaint } from '../api';
import { useT } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import type { CVData } from '../types';

interface Props { onBack: () => void; }

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'verified';    cv: CVData }
  | { kind: 'unverified' }
  | { kind: 'error';       message: string };

export function Support({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { t } = useT();

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setStatus({ kind: 'busy' });
    try {
      const loaded = await loadConfigFromFile(file);
      if (loaded.source !== 'pdf') {
        setStatus({ kind: 'error', message: t('support.errorPdfOnly') });
        return;
      }
      if (loaded.verified) {
        setStatus({ kind: 'verified', cv: loaded.cv });
      } else {
        setStatus({ kind: 'unverified' });
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
          <Result status={status} />
        </div>
      </div>
    </div>
  );
}

function Result({ status }: { status: Status }) {
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
  if (status.kind === 'unverified') {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm space-y-2">
        <p className="font-semibold text-amber-200">{t('support.unverifiedTitle')}</p>
        <p className="text-white/75">{t('support.unverifiedBody')}</p>
      </div>
    );
  }
  // verified
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm space-y-2">
        <p className="font-semibold text-emerald-200">{t('support.verifiedTitle')}</p>
        <p className="text-white/75">{t('support.verifiedBody')}</p>
      </div>

      <ComplaintForm
        expectedEmail={status.cv.personal.email}
        author={status.cv.personal.fullName}
      />
    </div>
  );
}

function ComplaintForm({ expectedEmail, author }: { expectedEmail: string; author: string }) {
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
      await submitComplaint({ email, subject, message, author });
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
