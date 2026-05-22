/**
 * Rank badge — the beaver-themed ladder driven by editCount.
 *
 * Two variants:
 *   - <Badge meta />          — full pill with icon, tier name, editCount label
 *   - <Badge meta compact />  — small chip for the Builder header
 *
 * Tier labels live in the i18n dictionary (badges.tiers[0..4].label / desc)
 * and are read via the `raw()` helper because dot-path indexing into arrays
 * isn't part of TPath. The editCount itself is non-mutable from the client
 * — it ships inside the server-encrypted payload and only the server can
 * increment it.
 */
import { useI18n } from '../i18n';
import type { CVMeta } from '../types';
import { tierFor, nextTierGap } from '../utils/badges';

interface Props {
  meta: CVMeta;
  compact?: boolean;
}

interface TierData { label: string; description: string }

const TIER_ICONS = ['🐾', '🪵', '🛠', '🏗', '🌳'];

export function Badge({ meta, compact = false }: Props) {
  const { t, raw } = useI18n();
  const tiers = raw<TierData[]>('badges.tiers') ?? [];
  const tier = tierFor(meta.editCount);
  const icon = TIER_ICONS[tier];
  const tierInfo = tiers[tier] ?? { label: '?', description: '' };

  if (compact) {
    return (
      <span
        title={tierInfo.description}
        className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)]"
      >
        <span aria-hidden>{icon}</span>
        <span>{tierInfo.label}</span>
      </span>
    );
  }

  const gap = nextTierGap(meta.editCount);
  const nextLabel = gap ? tiers[gap.nextLevel]?.label ?? '' : '';

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] p-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none" aria-hidden>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight">{tierInfo.label}</p>
          <p className="text-[12.5px] text-[color:var(--color-ink-muted)]">{tierInfo.description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px] text-[color:var(--color-ink-muted)]">
        <span>{t('badges.editCount', { n: String(meta.editCount) })}</span>
        {gap && (
          <span>{t('badges.nextHint', { n: String(gap.remaining), tier: nextLabel })}</span>
        )}
      </div>
    </div>
  );
}
