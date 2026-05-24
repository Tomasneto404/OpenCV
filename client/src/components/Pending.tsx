/**
 * Pending — shown when the buyer returns from Checkout but payment hasn't
 * settled yet. This happens with asynchronous methods (Multibanco / MB WAY):
 * the customer pays later at an ATM or via homebanking. There is nothing to
 * download here — the server's Stripe webhook renders and emails the PDF the
 * moment the payment confirms.
 */
import type { CVData } from '../types';
import { Preview } from './Preview';
import { useT } from '../i18n';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  cv: CVData;
  onReset: () => void;
}

export function Pending({ cv, onReset }: Props) {
  const { t } = useT();

  return (
    <div className="min-h-screen">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-[color:var(--color-border)]">
        <BrandMark withWordmark size={24} />
        <div className="flex items-center gap-3">
          <button className="btn-ghost text-sm" onClick={onReset}>{t('paid.startOther')}</button>
          <ThemeToggle />
        </div>
      </nav>

      <div className="px-6 py-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 text-xs text-amber-300 px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {t('pending.badge')}
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            {t('pending.title')}
          </h1>
          <p className="text-white/65 leading-relaxed">{t('pending.subtitle')}</p>
          <p className="text-[13px] text-[color:var(--color-ink-muted)] leading-relaxed">{t('pending.note')}</p>

          <button onClick={onReset} className="btn-ghost text-sm underline underline-offset-4">
            {t('pending.done')}
          </button>
        </div>

        <div className="flex justify-center items-start overflow-auto max-h-[calc(100vh-140px)] py-4">
          <Preview cv={cv} paid />
        </div>
      </div>
    </div>
  );
}
