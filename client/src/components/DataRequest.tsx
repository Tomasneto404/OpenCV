/**
 * Data request page — exposes the user's RGPD rights (Articles 15 & 17) in
 * plain language and provides a one-click mailto: to `PRIVACY_EMAIL`.
 *
 * Since CVeaver stores almost nothing server-side (24 h TTL on drafts, no
 * accounts, no PII archive), this page is mostly informational: it tells the
 * user what little there is to ask about and where to send the request.
 */
import { useI18n } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props { onBack: () => void; }

const PRIVACY_EMAIL = 'support@cveaver.com';

interface DataReqSection { h: string; p: string }

export function DataRequest({ onBack }: Props) {
  const { t, raw } = useI18n();
  const sections = raw<DataReqSection[]>('dataRequest.sections') ?? [];

  return (
    <div className="min-h-screen">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-[color:var(--color-border)]">
        <button className="btn-ghost text-sm" onClick={onBack}>← {t('common.back')}</button>
        <div className="flex items-center gap-3">
          <BrandMark withWordmark size={24} />
          <ThemeToggle />
        </div>
      </nav>

      <div className="px-6 py-12 max-w-2xl mx-auto">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('dataRequest.title')}</h1>
          <p className="mt-3 text-white/55 text-sm max-w-lg mx-auto leading-relaxed">{t('dataRequest.subtitle')}</p>
        </header>

        <p className="mt-8 text-sm text-white/72 leading-relaxed">{t('dataRequest.intro')}</p>

        <div className="mt-8 space-y-6">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold">{s.h}</h2>
              <p className="mt-1 text-sm text-white/72 leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>

        {/* CTA — mailto opens the user's email client pre-filled */}
        <section className="mt-10 rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] p-6">
          <h2 className="text-base font-semibold">{t('dataRequest.ctaTitle')}</h2>
          <p className="mt-1 text-sm text-white/65 leading-relaxed">{t('dataRequest.ctaBody')}</p>
          <a
            href={`mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(t('dataRequest.mailSubject'))}&body=${encodeURIComponent(t('dataRequest.mailBody'))}`}
            className="btn-primary mt-4 inline-flex text-sm"
          >
            {t('dataRequest.ctaButton')}
          </a>
          <p className="mt-3 text-[12px] text-white/45">{t('dataRequest.ctaEmailLabel')} {PRIVACY_EMAIL}</p>
        </section>
      </div>
    </div>
  );
}
