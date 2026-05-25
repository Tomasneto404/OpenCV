/**
 * Privacy policy page. Content lives in the i18n dictionary at `privacy.*`.
 *
 * IMPORTANT: this is a plain-language summary of how CVeaver handles data. It
 * should be reviewed by a lawyer before relying on it for compliance — see the
 * informational disclaimer banner.
 */
import { useI18n } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props { onBack: () => void; }

interface PrivacySection { h: string; p: string }

/** Fixed revision date for the policy (not "now"). Update on real changes. */
const LAST_UPDATED = '2026-05-25';

export function Privacy({ onBack }: Props) {
  const { t, raw, locale } = useI18n();
  const sections = raw<PrivacySection[]>('privacy.sections') ?? [];

  return (
    <div className="min-h-screen">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-[color:var(--color-border)]">
        <button className="btn-ghost text-sm" onClick={onBack}>← {t('common.back')}</button>
        <div className="flex items-center gap-3">
          <BrandMark withWordmark size={24} />
          <ThemeToggle />
        </div>
      </nav>

      <div className="px-6 py-12 max-w-3xl mx-auto">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('privacy.title')}</h1>
          <p className="mt-3 text-white/55 text-sm">
            {t('privacy.lastUpdated', { date: formatDate(LAST_UPDATED, locale) })}
          </p>
        </header>

        <p className="mt-6 text-sm text-white/72 leading-relaxed">{t('privacy.intro')}</p>

        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-[13px] text-amber-100/85">
          ⚠ {t('privacy.disclaimer')}
        </div>

        <div className="mt-8 space-y-6">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold">{s.h}</h2>
              <p className="mt-1 text-sm text-white/72 leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const tag = locale === 'pt' ? 'pt-PT' : locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
  return d.toLocaleDateString(tag, { year: 'numeric', month: 'long', day: 'numeric' });
}
