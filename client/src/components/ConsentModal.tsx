/**
 * ConsentModal — last-mile RGPD gate before Stripe Checkout.
 *
 * Two granular checkboxes (T&C + Privacy acceptance, and age ≥ MIN_AGE).
 * Both must be ticked before the primary button activates. On confirm we
 * persist a stamped consent record (see utils/legal) and run onConfirm().
 *
 * Shown only when the user has no current consent record (matching the
 * latest TERMS_VERSION / PRIVACY_VERSION). Subsequent payments skip it.
 */
import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { MIN_AGE, writeCheckoutConsent } from '../utils/legal';

interface Props {
  open: boolean;
  onCancel: () => void;
  /** Called after consent is persisted. Caller triggers the actual payment. */
  onConfirm: () => void;
  onNavigate: (path: string) => void;
}

export function ConsentModal({ open, onCancel, onConfirm, onNavigate }: Props) {
  const [terms, setTerms] = useState(false);
  const [age,   setAge]   = useState(false);
  const { t } = useT();

  // Reset state every time the modal is reopened.
  useEffect(() => {
    if (open) { setTerms(false); setAge(false); }
  }, [open]);

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const ready = terms && age;

  const confirm = () => {
    if (!ready) return;
    writeCheckoutConsent();
    onConfirm();
  };

  const link = (path: string, label: string) => (
    <a
      href={path}
      onClick={(e) => { e.preventDefault(); onNavigate(path); }}
      className="underline underline-offset-2 text-[color:var(--color-brand-500)] hover:text-[color:var(--color-brand-600)]"
    >{label}</a>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] p-5 sm:p-6 shadow-[var(--shadow-elevated)]">
        <h2 id="consent-title" className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
          {t('consent.title')}
        </h2>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-muted)] leading-relaxed">
          {t('consent.intro')}
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[color:var(--color-brand-500)]"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span className="text-[13px] leading-snug text-[color:var(--color-ink)]">
              {t('consent.termsPrefix')}{' '}
              {link('/terms',   t('consent.termsLabel'))}
              {' '}{t('consent.and')}{' '}
              {link('/privacy', t('consent.privacyLabel'))}.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[color:var(--color-brand-500)]"
              checked={age}
              onChange={(e) => setAge(e.target.checked)}
            />
            <span className="text-[13px] leading-snug text-[color:var(--color-ink)]">
              {t('consent.age', { age: String(MIN_AGE) })}
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" className="btn-ghost text-sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={confirm}
            disabled={!ready}
            aria-disabled={!ready}
          >
            {t('consent.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
