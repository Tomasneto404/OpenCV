/**
 * Terms of Service page. Content lives in the i18n dictionary at `terms.sections`.
 *
 * IMPORTANT: this is a skeleton for development. It MUST be reviewed by a
 * lawyer before going live — see the legal disclaimer banner.
 */
import { useI18n } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props { onBack: () => void; onNavigate: (path: string) => void; }

interface TermSection { h: string; p: string }

export function Terms({ onBack }: Props) {
  const { t, raw, locale } = useI18n();
  const sections = raw<TermSection[]>('terms.sections') ?? [];

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
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('terms.title')}</h1>
          <p className="mt-3 text-white/55 text-sm">
            {t('terms.lastUpdated', { date: formatDate(new Date(), locale) })}
          </p>
        </header>

        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-[13px] text-amber-100/85">
          ⚠ {t('terms.legalDisclaimer')}
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

function formatDate(d: Date, locale: string): string {
  const tag = locale === 'pt' ? 'pt-PT' : locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
  return d.toLocaleDateString(tag, { year: 'numeric', month: 'long', day: 'numeric' });
}
