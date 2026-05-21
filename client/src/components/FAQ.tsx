/**
 * Public FAQ page. Items live in the i18n dictionary at `faq.items` so they
 * stay in sync across languages.
 */
import { useI18n } from '../i18n';
import { PRICES, formatPrice } from '../utils/format';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props { onBack: () => void; onNavigate: (path: string) => void; }

interface FaqItem { q: string; a: string }

export function FAQ({ onBack }: Props) {
  const { t, locale, raw } = useI18n();
  const items = raw<FaqItem[]>('faq.items') ?? [];
  const priceUpdate = formatPrice(PRICES.updateCents, locale);

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
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('faq.title')}</h1>
          <p className="mt-3 text-white/70">{t('faq.subtitle')}</p>
        </header>

        <div className="mt-10 space-y-3">
          {items.map((it, i) => (
            <details key={i} className="group rounded-xl border border-white/10 bg-white/[0.02] open:bg-white/[0.04] transition">
              <summary className="cursor-pointer list-none px-4 py-3.5 flex items-center justify-between gap-4 text-[15px] font-medium">
                <span>{it.q}</span>
                <span className="text-white/40 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-white/70 leading-relaxed">
                {it.a.replace('{updatePrice}', priceUpdate)}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
