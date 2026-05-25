/**
 * About page. Content lives in the i18n dictionary at `about.*`.
 * Mirrors the Terms page layout: a back nav, a centred header, prose sections
 * driven by `about.sections`, and a closing CTA that drops into the Builder.
 */
import { useI18n } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props { onBack: () => void; onStart: () => void; }

interface AboutSection { h: string; p: string }

export function About({ onBack, onStart }: Props) {
  const { t, raw } = useI18n();
  const sections = raw<AboutSection[]>('about.sections') ?? [];

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
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('about.title')}</h1>
          <p className="mt-3 text-white/55 text-sm max-w-xl mx-auto leading-relaxed">{t('about.subtitle')}</p>
        </header>

        <div className="mt-10 space-y-6">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold">{s.h}</h2>
              <p className="mt-1 text-sm text-white/72 leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] p-8 text-center">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>{t('about.ctaTitle')}</h2>
          <p className="mt-2 text-sm text-white/65">{t('about.ctaBody')}</p>
          <button className="btn-primary mt-5 mx-auto" onClick={onStart}>{t('about.ctaButton')}</button>
        </div>
      </div>
    </div>
  );
}
