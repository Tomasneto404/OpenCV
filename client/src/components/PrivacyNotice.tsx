/**
 * PrivacyNotice — discreet bottom-right pill shown on first load.
 *
 * NOT a cookie banner: CVeaver uses cookieless analytics and stores no PII
 * server-side, so a strict "accept/reject" dialog would be misleading. The
 * notice points users to the Privacy page and self-dismisses with a single
 * "Got it" — RGPD-honest without dishonest patterns.
 *
 * State is purely client-side (localStorage flag).
 */
import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { dismissPrivacyNotice, isPrivacyNoticeDismissed } from '../utils/legal';

interface Props {
  onNavigate: (path: string) => void;
}

export function PrivacyNotice({ onNavigate }: Props) {
  /** Hide by default to avoid SSR / flash; reveal once we know the flag. */
  const [show, setShow] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (!isPrivacyNoticeDismissed()) setShow(true);
  }, []);

  if (!show) return null;

  const close = () => {
    dismissPrivacyNotice();
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label={t('notice.privacyTitle')}
      className="fixed bottom-3 right-3 left-3 sm:left-auto sm:max-w-sm z-40 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)]/95 backdrop-blur shadow-[var(--shadow-elevated)] p-4"
    >
      <p className="text-[13px] font-semibold text-[color:var(--color-ink)]">{t('notice.privacyTitle')}</p>
      <p className="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-muted)]">
        {t('notice.privacyBody')}{' '}
        <a
          href="/privacy"
          onClick={(e) => { e.preventDefault(); close(); onNavigate('/privacy'); }}
          className="underline underline-offset-2 text-[color:var(--color-brand-500)] hover:text-[color:var(--color-brand-600)]"
        >
          {t('notice.privacyLink')}
        </a>
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="btn-ghost text-[12.5px] px-3 py-1.5"
          onClick={close}
        >
          {t('notice.acknowledge')}
        </button>
      </div>
    </div>
  );
}
