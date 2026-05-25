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
 *   - Verified (server-decrypted PDF) → eligible €0.50.
 *   - Otherwise → toast and route to Builder at full €1.
 */
import { useRef, useState, type ReactNode } from 'react';
import type { CVData, CVMeta } from '../types';
import { loadConfigFromFile, ConfigLoadError } from '../utils/loadConfig';
import { useToast } from './Toast';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandMark } from './BrandMark';
import { BetaBadge } from './BetaBadge';
import { ThemeToggle } from './ThemeToggle';
import { FaqItem } from './FaqItem';
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
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark withWordmark size={36} />
            <BetaBadge />
          </div>
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
            <a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('/about'); }} className="hidden md:inline-flex h-9 items-center px-3 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">
              {t('landing.nav.about')}
            </a>
            <a href="/contacts" onClick={(e) => { e.preventDefault(); onNavigate('/contacts'); }} className="hidden md:inline-flex h-9 items-center px-3 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition">
              {t('landing.nav.contacts')}
            </a>
            <span className="hidden sm:inline-block w-px h-5 bg-[color:var(--color-border)] mx-1" />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <header className="px-6 pt-16 pb-10 sm:pt-20 sm:pb-14 text-center max-w-4xl mx-auto">
        <div className="flex justify-center mb-7 animate-rise">
          <BrandMark size={120} />
        </div>

        <div
          className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[color:var(--color-ink-muted)] mb-6 px-3 py-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] backdrop-blur animate-rise"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent-500)]" />
          {(() => {
            // Wrap the "PII" token in an <abbr> so hovering explains it.
            const parts = t('landing.hero.badge').split('PII');
            if (parts.length === 1) return parts[0];
            return (
              <span>
                {parts[0]}
                <abbr
                  title={t('landing.hero.piiTooltip')}
                  className="cursor-help no-underline border-b border-dotted border-current"
                >PII</abbr>
                {parts.slice(1).join('PII')}
              </span>
            );
          })()}
        </div>

        <h1 className="text-[40px] sm:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] animate-rise" style={{ fontFamily: 'Fraunces, serif' }}>
          {t('landing.hero.title')}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-[color:var(--color-brand-400)] to-[color:var(--color-accent-500)]">
            {t('landing.hero.titleAccent')}
          </span>
          <span className="text-[color:var(--color-ink)]">.</span>
        </h1>

        <p className="mt-5 text-[16.5px] sm:text-[17px] leading-[1.55] text-[color:var(--color-ink-muted)] max-w-2xl mx-auto animate-rise-delay">
          {t('landing.hero.subtitle', { price: priceNew, updatePrice: priceUpdate })}
        </p>
      </header>

      {/* ── Dual choice — the big call ─────────────────────────────── */}
      <section className="px-6 max-w-5xl mx-auto animate-rise-delay">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          <ChoiceCard
            tone="primary"
            label={t('landing.pricing.newLabel')}
            price={priceNew}
            title={t('landing.pricing.newTitle')}
            body={t('landing.pricing.newBody')}
            ctaLabel={t('landing.pricing.newCta')}
            onClick={onNew}
            icon={<IconCreate />}
          />
          <ChoiceCard
            tone="secondary"
            label={t('landing.pricing.updateLabel')}
            price={priceUpdate}
            title={t('landing.pricing.updateTitle')}
            body={t('landing.pricing.updateBody')}
            ctaLabel={busy ? t('landing.pricing.updateBusy') : t('landing.pricing.updateCta')}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            icon={<IconUpdate />}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {/* "Ver exemplo" — refined text link with sliding arrow */}
        <div className="mt-8 flex justify-center animate-rise-delay2">
          <button
            type="button"
            onClick={onSample}
            className="group inline-flex items-center gap-2 px-4 h-10 rounded-full text-[14px] font-medium text-[color:var(--color-ink-muted)] border border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-ink)] bg-[color:var(--color-glass-bg)] transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{t('landing.hero.ctaSample')}</span>
            <span
              className="text-[color:var(--color-ink-faint)] transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            >→</span>
          </button>
        </div>

        {/* Feature pills — payment methods + email */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[color:var(--color-ink-faint)] animate-rise-delay2">
          <Feat>{t('landing.hero.feature1')}</Feat>
          <Feat>{t('landing.hero.feature2')}</Feat>
          <Feat>{t('landing.hero.feature3')}</Feat>
          <Feat>{t('landing.hero.feature4')}</Feat>
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
          <FaqItem q={t('landing.faqShort.q1')}>{t('landing.faqShort.a1')}</FaqItem>
          <FaqItem q={t('landing.faqShort.q2')}>{t('landing.faqShort.a2')}</FaqItem>
          <FaqItem q={t('landing.faqShort.q3')}>{t('landing.faqShort.a3', { updatePrice: priceUpdate })}</FaqItem>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              <FooterCol title={t('landing.footerNav.product.title')}>
                <FooterLink onClick={onNew}>{t('landing.footerNav.product.create')}</FooterLink>
                <FooterLink onClick={() => fileRef.current?.click()}>{t('landing.footerNav.product.update')}</FooterLink>
                <FooterLink href="#how">{t('landing.footerNav.product.templates')}</FooterLink>
              </FooterCol>

              <FooterCol title={t('landing.footerNav.company.title')}>
                <FooterLink onClick={() => onNavigate('/about')}>{t('landing.nav.about')}</FooterLink>
                <FooterLink onClick={() => onNavigate('/contacts')}>{t('landing.nav.contacts')}</FooterLink>
                <FooterLink onClick={() => onNavigate('/changelog')}>{t('landing.nav.changelog')}</FooterLink>
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

/* ── Dual choice card ─────────────────────────────────────────────────
   "primary" tone uses the brand colour for the CTA + icon halo, signalling
   the default path (new CV). "secondary" stays neutral so the two cards
   feel equally clickable, just visually distinct. */
interface ChoiceCardProps {
  tone: 'primary' | 'secondary';
  label: string;
  price: string;
  title: string;
  body: string;
  ctaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
}

function ChoiceCard({ tone, label, price, title, body, ctaLabel, onClick, disabled, icon }: ChoiceCardProps) {
  const isPrimary = tone === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative overflow-hidden rounded-3xl border text-left p-7 sm:p-8',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-[3px] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand-400)]',
        isPrimary
          ? 'border-[color:var(--color-border-strong)] bg-[color:var(--color-glass-bg)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)]',
      ].join(' ')}
      style={{ boxShadow: 'var(--shadow-soft)' }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.boxShadow = 'var(--shadow-elevated)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-soft)')}
    >
      {/* Subtle accent glow corner — only on primary card */}
      {isPrimary && (
        <span
          aria-hidden
          className="absolute -top-12 -right-12 h-44 w-44 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(152,100,31,0.20), transparent)' }}
        />
      )}

      <div className="relative flex items-center justify-between mb-6">
        <div
          className={[
            'inline-flex items-center justify-center h-11 w-11 rounded-2xl',
            isPrimary
              ? 'bg-[color:var(--color-brand-500)] text-white'
              : 'bg-[color:var(--color-glass-bg)] border border-[color:var(--color-border-strong)] text-[color:var(--color-ink)]',
          ].join(' ')}
          style={isPrimary ? { boxShadow: '0 6px 18px -8px rgba(152,100,31,0.55)' } : undefined}
        >
          {icon}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--color-ink-muted)] font-semibold">
            {label}
          </span>
          <span className="text-[28px] sm:text-[32px] font-bold tracking-tight ml-3" style={{ fontFamily: 'Fraunces, serif' }}>
            {price}
          </span>
        </div>
      </div>

      <h3 className="text-[22px] sm:text-[24px] font-semibold tracking-tight leading-tight">{title}</h3>
      <p className="mt-3 text-[14.5px] text-[color:var(--color-ink-muted)] leading-relaxed">{body}</p>

      <div className="mt-7 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-[color:var(--color-brand-500)] transition-all duration-200 group-hover:gap-2.5">
        <span>{ctaLabel}</span>
        <span aria-hidden>→</span>
      </div>
    </button>
  );
}

function IconCreate() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconUpdate() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M3 21v-5h5" />
    </svg>
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
