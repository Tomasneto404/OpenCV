/**
 * Landing page — public marketing surface.
 *
 * Layout (Apple-ish in feel):
 *   - Sticky frosted nav (nav-glass), 64 px tall
 *   - Hero with generous whitespace, large mascot, soft entrance animation
 *   - Dual CTA pricing cards with hover lift
 *   - Template gallery (6 cards) with subtle elevation on hover
 *   - "How it works" three-step section
 *   - Short FAQ teaser
 *   - Structured footer with three columns (Product / Support / Legal)
 *     plus a copyright row and a small icon for theme/locale recap
 *
 * Update-flow gate:
 *   - Verified (server-decrypted PDF or original JSON) → eligible €0.50.
 *   - Otherwise → toast and route to Builder at full €1.
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
    <div className="min-h-screen flex flex-col">
      {/* ── Sticky nav ─────────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
          <BrandMark withWordmark size={36} />
          <div className="flex items-center gap-1 sm:gap-3">
            <a href="#how" className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">
              {t('landing.nav.howItWorks')}
            </a>
            <a href="/faq" onClick={(e) => { e.preventDefault(); onNavigate('/faq'); }} className="inline-flex h-9 items-center px-3 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">
              {t('landing.nav.faq')}
            </a>
            <a href="/support" onClick={(e) => { e.preventDefault(); onNavigate('/support'); }} className="inline-flex h-9 items-center px-3 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">
              {t('landing.nav.support')}
            </a>
            <span className="hidden sm:inline-block w-px h-5 bg-[color:var(--color-border)] mx-1" />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <header className="px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-8 animate-rise">
          <BrandMark size={144} />
        </div>

        <div
          className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[color:var(--color-ink-muted)] mb-7 px-3 py-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] backdrop-blur animate-rise"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent-500)]" />
          {t('landing.hero.badge')}
        </div>

        <h1 className="text-[44px] sm:text-[64px] font-bold leading-[1.04] tracking-[-0.025em] animate-rise" style={{ fontFamily: 'Fraunces, serif' }}>
          {t('landing.hero.title')}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-[color:var(--color-brand-400)] to-[color:var(--color-accent-500)]">
            {t('landing.hero.titleAccent')}
          </span>
          <span className="text-[color:var(--color-ink)]">.</span>
        </h1>

        <p className="mt-7 text-[17px] sm:text-[18px] leading-[1.55] text-[color:var(--color-ink-muted)] max-w-2xl mx-auto animate-rise-delay">
          {t('landing.hero.subtitle', { price: priceNew, updatePrice: priceUpdate })}
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 items-center justify-center animate-rise-delay">
          <button onClick={onNew} className="btn-primary px-6 text-[15px]">
            {t('landing.hero.ctaCreate', { price: priceNew })}
          </button>
          <button onClick={onSample} className="btn-ghost px-6 text-[15px]">
            {t('landing.hero.ctaSample')}
          </button>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[color:var(--color-ink-faint)] animate-rise-delay2">
          <Feat>{t('landing.hero.feature1')}</Feat>
          <Feat>{t('landing.hero.feature2')}</Feat>
          <Feat>{t('landing.hero.feature3')}</Feat>
          <Feat>{t('landing.hero.feature4')}</Feat>
        </div>
      </header>

      {/* ── Pricing dual-CTA ───────────────────────────────────────── */}
      <section className="px-6 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onNew} className="group glass rounded-2xl p-7 text-left transition-all duration-300 ease-out hover:-translate-y-[3px]" style={{ boxShadow: 'var(--shadow-soft)' }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-elevated)')} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-soft)')}>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--color-ink-muted)] font-semibold">
              {t('landing.pricing.newLabel')}
            </span>
            <span className="text-xl font-bold tracking-tight">{priceNew}</span>
          </div>
          <h3 className="mt-4 text-[22px] font-semibold tracking-tight">{t('landing.pricing.newTitle')}</h3>
          <p className="mt-2 text-[14.5px] text-[color:var(--color-ink-muted)] leading-relaxed">
            {t('landing.pricing.newBody')}
          </p>
          <span className="mt-5 inline-flex items-center gap-1 text-[color:var(--color-brand-500)] text-sm font-medium transition-all duration-200 group-hover:gap-2">
            {t('landing.pricing.newCta')}
          </span>
        </button>

        <div
          className="glass rounded-2xl p-7 text-left transition-all duration-300 ease-out hover:-translate-y-[3px]"
          style={{ boxShadow: 'var(--shadow-soft)' }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-elevated)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-soft)')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--color-ink-muted)] font-semibold">
              {t('landing.pricing.updateLabel')}
            </span>
            <span className="text-xl font-bold tracking-tight">{priceUpdate}</span>
          </div>
          <h3 className="mt-4 text-[22px] font-semibold tracking-tight">{t('landing.pricing.updateTitle')}</h3>
          <p className="mt-2 text-[14.5px] text-[color:var(--color-ink-muted)] leading-relaxed">
            {t('landing.pricing.updateBody')}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,application/json,.pdf,.json"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <button className="btn-ghost mt-5" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? t('landing.pricing.updateBusy') : t('landing.pricing.updateCta')}
          </button>
        </div>
      </section>

      {/* ── Templates gallery ──────────────────────────────────────── */}
      <section className="px-6 mt-28 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-kicker">{t('landing.templates.kicker')}</p>
          <h2 className="mt-3 text-[32px] sm:text-[40px] font-semibold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
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

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="how" className="px-6 mt-32 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-kicker">{t('landing.how.kicker')}</p>
          <h2 className="mt-3 text-[32px] sm:text-[40px] font-semibold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            {t('landing.how.title')}
          </h2>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step n={1} title={t('landing.how.step1Title')}                          body={t('landing.how.step1Body')} />
          <Step n={2} title={t('landing.how.step2Title', { price: priceNew })}     body={t('landing.how.step2Body')} />
          <Step n={3} title={t('landing.how.step3Title')}                          body={t('landing.how.step3Body')} />
        </ol>
      </section>

      {/* ── FAQ teaser ─────────────────────────────────────────────── */}
      <section className="px-6 mt-32 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="section-kicker">{t('landing.faqShort.kicker')}</p>
          <h2 className="mt-3 text-[32px] sm:text-[40px] font-semibold tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            {t('landing.faqShort.title')}
          </h2>
        </div>
        <div className="space-y-3">
          <Faq q={t('landing.faqShort.q1')}>{t('landing.faqShort.a1')}</Faq>
          <Faq q={t('landing.faqShort.q2')}>{t('landing.faqShort.a2')}</Faq>
          <Faq q={t('landing.faqShort.q3')}>{t('landing.faqShort.a3', { updatePrice: priceUpdate })}</Faq>
        </div>
        <div className="text-center mt-6">
          <a
            href="/faq"
            onClick={(e) => { e.preventDefault(); onNavigate('/faq'); }}
            className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-brand-500)] hover:text-[color:var(--color-brand-600)] transition"
          >
            {t('landing.faqShort.seeAll')}
          </a>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="mt-32 border-t border-[color:var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-14">
          {/* Top row: brand on left, columns on right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-10">
            <div className="space-y-3">
              <BrandMark withWordmark size={32} />
              <p className="text-[13.5px] text-[color:var(--color-ink-muted)] leading-relaxed max-w-xs">
                {t('landing.footerNav.tagline')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <FooterCol title={t('landing.footerNav.product.title')}>
                <FooterLink onClick={onNew}>{t('landing.footerNav.product.create')}</FooterLink>
                <FooterLink onClick={() => fileRef.current?.click()}>{t('landing.footerNav.product.update')}</FooterLink>
                <FooterLink href="#how">{t('landing.footerNav.product.templates')}</FooterLink>
              </FooterCol>

              <FooterCol title={t('landing.footerNav.support.title')}>
                <FooterLink onClick={() => onNavigate('/faq')}>{t('landing.nav.faq')}</FooterLink>
                <FooterLink onClick={() => onNavigate('/support')}>{t('landing.nav.support')}</FooterLink>
              </FooterCol>

              <FooterCol title={t('landing.footerNav.legal.title')}>
                <FooterLink onClick={() => onNavigate('/terms')}>{t('landing.nav.terms')}</FooterLink>
                <FooterLink disabledHint={t('landing.footerNav.legal.comingSoon')}>
                  {t('landing.footerNav.legal.privacy')}
                </FooterLink>
              </FooterCol>
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-12 pt-6 border-t border-[color:var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-[12.5px] text-[color:var(--color-ink-faint)]">
              {t('landing.footerNav.copyright', { year: String(new Date().getFullYear()) })}
            </p>
            <p className="text-[12.5px] text-[color:var(--color-ink-faint)]">
              {t('landing.footerNav.craftedIn')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feat({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1 w-1 rounded-full bg-[color:var(--color-ink-faint)]" />
      {children}
    </span>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-[2px]" style={{ boxShadow: 'var(--shadow-soft)' }}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-brand-500)] text-white text-[13px] font-semibold">
          {n}
        </span>
        <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-3 text-[14px] text-[color:var(--color-ink-muted)] leading-relaxed">{body}</p>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] open:border-[color:var(--color-border-strong)] transition-colors">
      <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 text-[15px] font-medium">
        <span>{q}</span>
        <span className="text-[color:var(--color-ink-faint)] transition-transform duration-200 group-open:rotate-45 text-lg leading-none">+</span>
      </summary>
      <div className="px-5 pb-5 text-[14px] text-[color:var(--color-ink-muted)] leading-relaxed">{children}</div>
    </details>
  );
}

/* ── Footer helpers ────────────────────────────────────────────────── */
function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="footer-col-title">{title}</p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

interface FooterLinkProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabledHint?: string;
}

function FooterLink({ children, onClick, href, disabledHint }: FooterLinkProps) {
  if (disabledHint) {
    return (
      <li>
        <span className="footer-link" aria-disabled="true" title={disabledHint}>
          {children} <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">· {disabledHint}</span>
        </span>
      </li>
    );
  }
  return (
    <li>
      <a
        href={href ?? '#'}
        onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
        className="footer-link"
      >
        {children}
      </a>
    </li>
  );
}

/* ── Mini-template previews (decorative SVG, no real CV data) ──────── */
function TemplatePreview({ label, tagline, kind, comingSoon }: { label: string; tagline: string; kind: 'modern' | 'classic' | 'minimal' | 'creative' | 'executive' | 'soon'; comingSoon?: boolean }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] transition-all duration-300 hover:-translate-y-[3px]"
      style={{ boxShadow: 'var(--shadow-soft)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-elevated)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-soft)')}
    >
      <div className="aspect-[3/4] bg-white text-[#0f172a] text-[7px] leading-tight overflow-hidden">
        {kind === 'modern'    && <MiniModern />}
        {kind === 'classic'   && <MiniClassic />}
        {kind === 'minimal'   && <MiniMinimal />}
        {kind === 'creative'  && <MiniCreative />}
        {kind === 'executive' && <MiniExecutive />}
        {kind === 'soon'      && <MiniSoon />}
      </div>
      <div className="px-4 py-3 border-t border-[color:var(--color-border)]">
        <p className="text-[14px] font-medium tracking-tight text-[color:var(--color-ink)]">{label}</p>
        <p className="text-[11.5px] text-[color:var(--color-ink-muted)]">{tagline}</p>
      </div>
      {comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <span className="text-[11px] uppercase tracking-[0.25em] text-white/90 font-semibold border border-white/30 rounded-full px-3 py-1.5">
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
