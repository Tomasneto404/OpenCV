/**
 * Public FAQ page. Items live in the i18n dictionary at `faq.items` so they
 * stay in sync across languages. Accordion behaviour comes from the shared
 * <FaqItem/> component (smooth grid-row animation, fixed header height).
 */
import { useI18n } from '../i18n';
import { PRICES, formatPrice } from '../utils/format';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { FaqItem } from './FaqItem';

interface Props { onBack: () => void; onNavigate: (path: string) => void; }

interface Item { q: string; a: string }

export function FAQ({ onBack }: Props) {
  const { t, locale, raw } = useI18n();
  const items = raw<Item[]>('faq.items') ?? [];
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

      <div className="px-6 py-16 max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-[40px] sm:text-[48px] font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            {t('faq.title')}
          </h1>
          <p className="mt-3 text-[color:var(--color-ink-muted)]">{t('faq.subtitle')}</p>
        </header>

        <div className="space-y-3">
          {items.map((it, i) => (
            <FaqItem key={i} q={it.q}>
              {it.a.replace('{updatePrice}', priceUpdate)}
            </FaqItem>
          ))}
        </div>
      </div>
    </div>
  );
}
