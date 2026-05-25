/**
 * Changelog page — footer-only link. Page chrome (title/subtitle) is i18n;
 * the entries themselves are English-only and live in utils/changelog.ts.
 */
import { useI18n } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { CHANGELOG } from '../utils/changelog';

interface Props { onBack: () => void; }

export function Changelog({ onBack }: Props) {
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

      <div className="px-6 py-12 max-w-3xl mx-auto">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('changelog.title')}</h1>
          <p className="mt-3 text-white/55 text-sm max-w-xl mx-auto leading-relaxed">{t('changelog.subtitle')}</p>
        </header>

        <ol className="mt-12 space-y-10">
          {CHANGELOG.map((entry) => (
            <li key={entry.date} className="relative pl-6 border-l border-[color:var(--color-border)]">
              <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-400" aria-hidden />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold">{entry.title}</h2>
                {entry.version && (
                  <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/60">
                    {entry.version}
                  </span>
                )}
              </div>
              <time dateTime={entry.date} className="block mt-0.5 text-xs text-white/45">
                {formatDate(entry.date)}
              </time>
              <ul className="mt-3 space-y-1.5">
                {entry.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-sm text-white/72 leading-relaxed">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Entries are English-only, so render the date in English (e.g. "25 May 2026"). */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
