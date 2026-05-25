/**
 * Contact page. Copy lives in the i18n dictionary at `contacts.*`.
 *
 * The email + social handles are NOT translatable, so they live here as plain
 * constants. ⚠ Update CONTACT_EMAIL / SOCIALS with the real accounts before
 * going live — the social handles below are placeholders.
 */
import { useI18n } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props { onBack: () => void; onNavigate: (path: string) => void; }

const CONTACT_EMAIL = 'support@cveaver.com';

/** Placeholder handles — swap for the real accounts. */
const SOCIALS: { label: string; handle: string; href: string }[] = [
  { label: 'Instagram', handle: '@cveaver', href: 'https://instagram.com/cveaver' },
  { label: 'LinkedIn',  handle: 'CVeaver',  href: 'https://www.linkedin.com/company/cveaver' },
];

export function Contacts({ onBack, onNavigate }: Props) {
  const { t } = useI18n();

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
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('contacts.title')}</h1>
          <p className="mt-3 text-white/55 text-sm max-w-lg mx-auto leading-relaxed">{t('contacts.subtitle')}</p>
        </header>

        <div className="mt-10 space-y-4">
          {/* Email */}
          <section className="rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/55">{t('contacts.emailTitle')}</h2>
            <p className="mt-1 text-sm text-white/65">{t('contacts.emailBody')}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 inline-block text-base font-medium text-brand-300 hover:text-brand-200 underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
          </section>

          {/* Social */}
          <section className="rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/55">{t('contacts.socialTitle')}</h2>
            <p className="mt-1 text-sm text-white/65">{t('contacts.socialBody')}</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white/80 hover:text-white hover:border-white/20 transition">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-white/45">{s.handle}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Support */}
          <section className="rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] p-6">
            <h2 className="text-base font-semibold">{t('contacts.supportTitle')}</h2>
            <p className="mt-1 text-sm text-white/65 leading-relaxed">{t('contacts.supportBody')}</p>
            <button className="btn-ghost mt-4 text-sm" onClick={() => onNavigate('/support')}>
              {t('contacts.supportButton')} →
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
