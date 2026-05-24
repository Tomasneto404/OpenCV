/**
 * BetaBadge — a small "Beta" pill shown while payments are not live yet.
 * Driven by the single BETA_PAYMENTS flag in App.tsx. Renders nothing once
 * that flag is flipped off, so it disappears app-wide on go-live.
 */
import { BETA_PAYMENTS } from '../App';
import { useT } from '../i18n';

export function BetaBadge({ className = '' }: { className?: string }) {
  const { t } = useT();
  if (!BETA_PAYMENTS) return null;
  return (
    <span
      title={t('beta.badgeTitle')}
      className={`inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 select-none ${className}`}
    >
      {t('beta.badge')}
    </span>
  );
}
