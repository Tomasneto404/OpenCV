/**
 * Certificates section in the Builder.
 *
 * Lets the user attach up to 5 PDFs (5 MB each, 15 MB combined) which are
 * appended as extra pages at the end of the generated CV PDF.
 *
 * Storage model: the raw bytes live in cv.certificates[i].pdfDataUrl
 * (base64). That keeps re-export / re-edit self-contained — the user can
 * lose the source files and still regenerate the CV from the JSON.
 *
 * Caveats called out to the user:
 *   - Encrypted / password-protected PDFs are rejected.
 *   - The total CV JSON can become large (≤ 15 MB plus the rest of the CV);
 *     localStorage tops out at ~5 MB in most browsers, so we warn when the
 *     draft can no longer be auto-saved.
 */
import { useRef, useState, type ChangeEvent } from 'react';
import type { CertificateItem } from '../../types';
import {
  processCertificate, totalCertBytes, formatBytes,
  CERT_MAX_COUNT, CERT_TOTAL_CAP, CertError,
} from '../../utils/certificate';
import { useT } from '../../i18n';

interface Props {
  items: CertificateItem[] | undefined;
  onChange: (next: CertificateItem[]) => void;
}

export function CertificatesSection({ items, onChange }: Props) {
  const certs = items ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const { t } = useT();

  const totalBytes = totalCertBytes(certs);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;

    setError(null);

    if (certs.length >= CERT_MAX_COUNT) {
      setError(t('certificates.errTooMany'));
      return;
    }

    setBusy(true);
    try {
      const cert = await processCertificate(file, nameDraft, descDraft);
      if (totalBytes + cert.bytes > CERT_TOTAL_CAP) {
        setError(t('certificates.errTotalCap'));
        return;
      }
      onChange([...certs, cert]);
      setNameDraft('');
      setDescDraft('');
    } catch (err) {
      if (err instanceof CertError) {
        const map: Record<typeof err.code, string> = {
          'too-large':  t('certificates.errTooLarge'),
          'not-pdf':    t('certificates.errBadPdf'),
          'encrypted':  t('certificates.errEncrypted'),
          'bad-pdf':    t('certificates.errBadPdf'),
        };
        setError(map[err.code]);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (id: string) => onChange(certs.filter((c) => c.id !== id));
  const updateAt = (id: string, patch: Partial<CertificateItem>) =>
    onChange(certs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{t('certificates.title')}</h3>
        <p className="mt-1 text-[12px] text-white/55 leading-relaxed">{t('certificates.help')}</p>
        <p className="mt-1 text-[11px] text-white/45">
          {t('certificates.totalLabel', { total: formatBytes(totalBytes) })}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">{t('certificates.name')}</label>
            <input className="field"
              placeholder={t('certificates.namePlaceholder')}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('certificates.description')}</label>
            <input className="field"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)} />
          </div>
        </div>

        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={onPick} />
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy || certs.length >= CERT_MAX_COUNT}
        >
          {busy ? t('common.loading') : t('certificates.addCta')}
        </button>

        {error && <p className="text-[12px] text-red-300">{error}</p>}
      </div>

      {certs.length === 0 ? (
        <p className="text-[12px] text-white/45">{t('certificates.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {certs.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-200 text-[10px] font-mono shrink-0">
                  PDF
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    className="field text-sm"
                    value={c.name}
                    onChange={(e) => updateAt(c.id, { name: e.target.value })}
                  />
                  <input
                    className="field text-sm"
                    placeholder={t('certificates.description')}
                    value={c.description}
                    onChange={(e) => updateAt(c.id, { description: e.target.value })}
                  />
                  <p className="text-[11px] text-white/45">
                    {t('certificates.sizeLabel', {
                      size: formatBytes(c.bytes),
                      pages: c.pageCount,
                      pageLabel: c.pageCount === 1 ? t('certificates.page') : t('certificates.pages'),
                    })}
                  </p>
                  <p className="text-[10.5px] text-white/30 font-mono break-all">{c.hash.slice(0, 32)}…</p>
                </div>
                <button
                  type="button"
                  className="text-white/40 hover:text-red-300 text-sm"
                  onClick={() => removeAt(c.id)}
                  aria-label={t('common.remove')}
                >×</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
