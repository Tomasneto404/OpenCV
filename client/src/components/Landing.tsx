/**
 * Landing page — public entry point. Acts as marketing surface + dual CTA
 * (start new CV vs. update an existing one) + routing into builder/support/faq.
 *
 * Localised: all visible strings come from the i18n dictionary.
 *
 * Update flow gate:
 *   - JSON file → loaded as "update" mode (€0.50).
 *   - PDF with valid signature → loaded as "update".
 *   - PDF without signature OR with invalid signature → blocked from "update",
 *     user can choose to start fresh with the content at "new" price (€1).
 *     This rule is enforced in App.onLoadConfig via the `sourceVerified` flag.
 */
import { useRef, useState, type ReactNode } from 'react';
import type { CVData, CVMeta } from '../types';
import { loadConfigFromFile, ConfigLoadError } from '../utils/loadConfig';
import { useToast } from './Toast';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { useT } from '../i18n';
import { PRICES, formatPrice } from '../utils/format';

interface Props {
  onNew: () => void;
  /**
   * Called when the user uploads a JSON or PDF.
   * `opts.verified` true ⇒ eligible for the €0.50 update tier.
   */
  onLoadConfig: (cv: CVData, opts?: { verified?: boolean; meta?: CVMeta; prevPayloadB64?: string }) => void;
  onSample: () => void;
  onNavigate: (path: string) => void;
}

export function Landing({ onNew, onLoadConfig, onSample, onNavigate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t, locale } = useT();

  const priceNew    = formatPrice(PRICES.newCents,    locale);
  const priceUpdate = formatPrice(PRICES.updateCents, locale);

  /**
   * Hand off the uploaded file to the server's /decode-pdf (PDFs) or parse
   * inline (JSON). The server returns `verified` + meta + an opaque cipher
   * blob; we just propagate them up.
   */
  const handleFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const loaded = await loadConfigFromFile(file);
      if (loaded.verified) {
        toast.push({ kind: 'success', title: t('toast.cvLoaded') });
        onLoadConfig(loaded.cv, {
          verified: true,
          meta: loaded.meta,
          prevPayloadB64: loaded.prevPayloadB64,
        });
        return;
      }
      toast.push({ kind: 'info', title: t('toast.pdfNotRecognised'), body: t('toast.pdfNotRecognisedBody') });
      onLoadConfig(loaded.cv, { verified: false });
    } catch (err) {
      const msg = err instanceof ConfigLoadError ? err.message : (err as Error).message;
      toast.push({ kind: 'error', title: t('toast.cannotOpenTitle'), body: msg });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto gap-3">
        <BrandMark withWordmark size={44} />
        <div className="flex items-center gap-4 sm:gap-5">
          <a href="#how" className="hidden sm:inline text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">{t('landing.nav.howItWorks')}</a>
          <a href="/faq"     onClick={(e) => { e.preventDefault(); onNavigate('/faq'); }}     className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">{t('landing.nav.faq')}</a>
          <a href="/support" onClick={(e) => { e.preventDefault(); onNavigate('/support'); }} className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">{t('landing.nav.support')}</a>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <header className="px-6 pt-8 pb-16 text-center max-w-3xl mx-auto">
        {/* Brand mascot — large hero rendition. Tells the user instantly what
            CVeaver is and gives the page a strong identity anchor. */}
        <div className="flex justify-center mb-6">
          <BrandMark size={128} />
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-white/65 mb-6 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('landing.hero.badge')}
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]" style={{ fontFamily: 'Fraunces, serif' }}>
          {t('landing.hero.title')}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-brand-300 to-accent-400">{t('landing.hero.titleAccent')}</span>.
        </h1>
        <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-2xl mx-auto">
          {t('landing.hero.subtitle', { price: priceNew, updatePrice: priceUpdate })}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <button onClick={onNew} className="btn-primary px-6 py-3 text-base">
            {t('landing.hero.ctaCreate', { price: priceNew })}
          </button>
          <button onClick={onSample} className="btn-ghost px-6 py-3 text-base">
            {t('landing.hero.ctaSample')}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/45">
          <Feat>{t('landing.hero.feature1')}</Feat>
          <Feat>{t('landing.hero.feature2')}</Feat>
          <Feat>{t('landing.hero.feature3')}</Feat>
          <Feat>{t('landing.hero.feature4')}</Feat>
        </div>
      </header>

      {/* Pricing CTA */}
      <section className="px-6 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onNew} className="glass rounded-2xl p-7 text-left hover:bg-white/[0.07] transition group">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase tracking-wider text-white/50">{t('landing.pricing.newLabel')}</span>
            <span className="text-xl font-bold text-white">{priceNew}</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold">{t('landing.pricing.newTitle')}</h3>
          <p className="mt-2 text-sm text-white/65 leading-relaxed">{t('landing.pricing.newBody')}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-brand-300 text-sm font-medium group-hover:gap-2 transition-all">
            {t('landing.pricing.newCta')}
          </span>
        </button>

        <div className="glass rounded-2xl p-7 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase tracking-wider text-white/50">{t('landing.pricing.updateLabel')}</span>
            <span className="text-xl font-bold text-white">{priceUpdate}</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold">{t('landing.pricing.updateTitle')}</h3>
          <p className="mt-2 text-sm text-white/65 leading-relaxed">{t('landing.pricing.updateBody')}</p>
          <input ref={fileRef} type="file" accept="application/pdf,application/json,.pdf,.json" hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <button className="btn-ghost mt-5" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? t('landing.pricing.updateBusy') : t('landing.pricing.updateCta')}
          </button>
        </div>
      </section>

      {/* Templates teaser */}
      <section className="px-6 mt-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t('landing.templates.kicker')}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            {t('landing.templates.title')}
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TemplatePreview label="Modern"    tagline="Sidebar"   kind="modern" />
          <TemplatePreview label="Classic"   tagline="ATS"       kind="classic" />
          <TemplatePreview label="Minimal"   tagline="Typography" kind="minimal" />
          <TemplatePreview label="Executive" tagline="Premium"   kind="executive" />
        </div>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TemplatePreview label="Creative"  tagline="Header"            kind="creative" />
          <TemplatePreview label="Compact"   tagline={t('landing.templates.comingSoon')} kind="soon" comingSoon />
          <div className="hidden lg:block" />
          <div className="hidden lg:block" />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 mt-24 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t('landing.how.kicker')}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('landing.how.title')}</h2>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step n={1} title={t('landing.how.step1Title')} body={t('landing.how.step1Body')} />
          <Step n={2} title={t('landing.how.step2Title', { price: priceNew })} body={t('landing.how.step2Body')} />
          <Step n={3} title={t('landing.how.step3Title')} body={t('landing.how.step3Body')} />
        </ol>
      </section>

      {/* FAQ teaser */}
      <section className="px-6 mt-24 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{t('landing.faqShort.kicker')}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>{t('landing.faqShort.title')}</h2>
        </div>
        <div className="space-y-3">
          <Faq q={t('landing.faqShort.q1')}>{t('landing.faqShort.a1')}</Faq>
          <Faq q={t('landing.faqShort.q2')}>{t('landing.faqShort.a2')}</Faq>
          <Faq q={t('landing.faqShort.q3')}>{t('landing.faqShort.a3', { updatePrice: priceUpdate })}</Faq>
        </div>
        <div className="text-center mt-5">
          <a href="/faq" onClick={(e) => { e.preventDefault(); onNavigate('/faq'); }} className="text-sm text-brand-300 hover:text-brand-200 underline underline-offset-4">
            {t('landing.faqShort.seeAll')}
          </a>
        </div>
      </section>

      <footer className="mt-24 mb-8 text-xs text-white/40 text-center px-6 space-x-3">
        <span>{t('landing.footer')}</span>
        <span>·</span>
        <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigate('/terms'); }} className="underline">{t('landing.nav.terms')}</a>
      </footer>
    </div>
  );
}

function Feat({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" />{children}</span>;
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white text-sm font-semibold">{n}</span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-white/65 leading-relaxed">{body}</p>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.02] open:bg-white/[0.04] transition">
      <summary className="cursor-pointer list-none px-4 py-3.5 flex items-center justify-between gap-4 text-[15px] font-medium">
        <span>{q}</span>
        <span className="text-white/40 group-open:rotate-45 transition-transform">+</span>
      </summary>
      <div className="px-4 pb-4 text-sm text-white/70 leading-relaxed">{children}</div>
    </details>
  );
}

/**
 * Decorative mini-CV — purely SVG/Tailwind, no real CV data. Used in the
 * landing template gallery so visitors get a feel for the styles.
 *
 * The `comingSoon` overlay deliberately covers the mini so visitors can't
 * mistake a placeholder for a real template option.
 */
function TemplatePreview({ label, tagline, kind, comingSoon }: { label: string; tagline: string; kind: 'modern' | 'classic' | 'minimal' | 'creative' | 'executive' | 'soon'; comingSoon?: boolean }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition">
      <div className="aspect-[3/4] bg-white text-[#0f172a] text-[7px] leading-tight overflow-hidden">
        {kind === 'modern'    && <MiniModern />}
        {kind === 'classic'   && <MiniClassic />}
        {kind === 'minimal'   && <MiniMinimal />}
        {kind === 'creative'  && <MiniCreative />}
        {kind === 'executive' && <MiniExecutive />}
        {kind === 'soon'      && <MiniSoon />}
      </div>
      <div className="px-3 py-2.5 border-t border-white/10">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-[11px] text-white/55">{tagline}</p>
      </div>
      {comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <span className="text-xs uppercase tracking-[0.25em] text-white/90 font-semibold border border-white/30 rounded-full px-3 py-1.5">
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
}

function MiniModern() {
  return (
    <div className="flex h-full">
      <div className="w-1/3 bg-blue-900 p-2 text-white">
        <div className="h-7 w-7 rounded-full bg-white/30 mx-auto" />
        <div className="mt-2 h-1.5 bg-white/40 rounded" />
        <div className="mt-1 h-1 bg-white/30 rounded w-3/4 mx-auto" />
      </div>
      <div className="flex-1 p-2 space-y-1">
        <div className="h-1.5 bg-blue-900 rounded w-1/3" />
        <div className="h-0.5 bg-slate-300 rounded" />
        <div className="h-0.5 bg-slate-300 rounded w-5/6" />
        <div className="mt-2 h-1.5 bg-blue-900 rounded w-1/4" />
        <div className="h-0.5 bg-slate-300 rounded" />
      </div>
    </div>
  );
}

function MiniClassic() {
  return (
    <div className="p-3 text-center space-y-1">
      <div className="h-2 bg-slate-800 rounded mx-auto w-1/2" />
      <div className="h-1 bg-slate-400 rounded mx-auto w-1/3" />
      <div className="h-px bg-slate-300 my-2" />
      <div className="h-1 bg-slate-700 rounded w-1/3 text-left" />
      <div className="h-0.5 bg-slate-400 rounded" />
      <div className="h-0.5 bg-slate-400 rounded w-4/5" />
      <div className="h-1 bg-slate-700 rounded w-1/4 mt-2" />
      <div className="h-0.5 bg-slate-400 rounded" />
    </div>
  );
}

function MiniMinimal() {
  return (
    <div className="p-3 space-y-1">
      <div className="h-2 bg-slate-900 rounded w-2/3" />
      <div className="h-1 bg-slate-400 rounded w-1/2" />
      <div className="h-0.5 bg-teal-700 w-6" />
      <div className="flex gap-1.5 pt-2">
        <div className="w-1/4 h-0.5 bg-slate-300 rounded mt-0.5" />
        <div className="flex-1 space-y-0.5">
          <div className="h-1 bg-slate-700 rounded w-3/4" />
          <div className="h-0.5 bg-slate-400 rounded" />
        </div>
      </div>
    </div>
  );
}

function MiniCreative() {
  return (
    <div className="h-full">
      <div className="p-3 bg-red-900/10 border-b border-red-900/30">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-red-900" />
          <div className="flex-1">
            <div className="h-1.5 bg-slate-800 rounded w-3/5" />
            <div className="mt-1 h-1 bg-slate-400 rounded w-2/3" />
          </div>
        </div>
      </div>
      <div className="flex p-2 gap-2">
        <div className="flex-1 space-y-1">
          <div className="h-1 bg-red-900 rounded w-1/3" />
          <div className="h-0.5 bg-slate-400 rounded" />
        </div>
        <div className="w-1/3 space-y-1">
          <div className="h-1 bg-red-900 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

function MiniExecutive() {
  return (
    <div className="p-3">
      <div className="border-b-2 border-slate-900 pb-1 mb-2">
        <div className="h-2 bg-slate-900 rounded w-1/2" />
        <div className="mt-1 h-1 bg-slate-500 rounded w-3/4" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-1">
          <div className="h-0.5 bg-slate-800 w-12" />
          <div className="h-0.5 bg-slate-400 rounded" />
          <div className="h-0.5 bg-slate-400 rounded w-5/6" />
          <div className="h-0.5 bg-slate-800 w-12 mt-2" />
          <div className="h-0.5 bg-slate-400 rounded" />
        </div>
        <div className="space-y-1">
          <div className="h-0.5 bg-slate-800 w-8" />
          <div className="h-0.5 bg-slate-400 rounded" />
          <div className="h-0.5 bg-slate-400 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

function MiniSoon() {
  return (
    <div className="h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
      <div className="text-slate-400 text-2xl">⋯</div>
    </div>
  );
}
