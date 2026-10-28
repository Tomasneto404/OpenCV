/**
 * Language switcher rendered in the landing nav.
 *
 * Why SVG flags instead of emoji?
 *   - Windows lacks bundled flag-emoji glyphs by default, so 🇵🇹 renders as
 *     "PT" letters on most non-mac browsers. Inline SVGs render the same
 *     across OSes and add ~3 KB to the bundle.
 *   - Aspect ratio of all flags here is 3:2.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n, SUPPORTED_LOCALES } from '../i18n';
import type { Locale } from '../i18n/types';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.label')}
        className="btn-ghost items-center gap-2 px-2.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] hover:bg-[color:var(--color-field-hover)] text-sm text-[color:var(--color-ink)] transition"
      >
        <Flag code={locale} className="h-3.5 w-5 rounded-[2px] shrink-0" />
        <span className="hidden sm:inline">{current?.native}</span>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] py-1 z-50"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === locale}
                onClick={() => { setLocale(l.code); setOpen(false); }}
                className={[
                  'w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition',
                  l.code === locale
                    ? 'bg-[color:var(--color-glass-bg)] text-[color:var(--color-ink)] font-medium'
                    : 'text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-glass-bg)] hover:text-[color:var(--color-ink)]',
                ].join(' ')}
              >
                <Flag code={l.code} className="h-3.5 w-5 rounded-[2px] shrink-0" />
                <span>{l.native}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Minimal SVG flag set. Designed to be visually distinct at 20×14 px.
 * Not pixel-perfect heraldry — good enough for a UI chip.
 */
export function Flag({ code, className }: { code: Locale; className?: string }) {
  switch (code) {
    case 'pt':
      return (
        <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
          <rect width="12" height="20" fill="#006600"/>
          <rect x="12" width="18" height="20" fill="#FF0000"/>
          <g fill="none" stroke="#FFCC00" strokeWidth="0.45">
            <circle cx="12" cy="10" r="4"/>
            <ellipse cx="12" cy="10" rx="1.8" ry="4"/>
            <ellipse cx="12" cy="10" rx="4" ry="1.5"/>
            <path d="M8.5 8l7 4M8.5 12l7-4"/>
          </g>
          <path d="M9.5 7h5v4a2.5 2.5 0 0 1-5 0Z" fill="#fff" stroke="#C8102E" strokeWidth="0.8"/>
          <g fill="#0033A0">
            <path d="M11.6 7.7h.8v.7a.4.4 0 0 1-.8 0ZM10.4 9.2h.8v.7a.4.4 0 0 1-.8 0ZM11.6 9.2h.8v.7a.4.4 0 0 1-.8 0ZM12.8 9.2h.8v.7a.4.4 0 0 1-.8 0ZM11.6 10.8h.8v.7a.4.4 0 0 1-.8 0Z"/>
          </g>
        </svg>
      );
    case 'en':
      return (
        <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
          <rect width="30" height="20" fill="#012169"/>
          <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="3"/>
          <path d="M0 0 L30 20 M30 0 L0 20" stroke="#C8102E" strokeWidth="1.5"/>
          <path d="M15 0 V20 M0 10 H30" stroke="#fff" strokeWidth="5"/>
          <path d="M15 0 V20 M0 10 H30" stroke="#C8102E" strokeWidth="3"/>
        </svg>
      );
    case 'es':
      return (
        <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
          <rect width="30" height="20" fill="#AA151B"/>
          <rect y="5" width="30" height="10" fill="#F1BF00"/>
        </svg>
      );
    case 'fr':
      return (
        <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
          <rect width="10" height="20" fill="#0055A4"/>
          <rect x="10" width="10" height="20" fill="#fff"/>
          <rect x="20" width="10" height="20" fill="#EF4135"/>
        </svg>
      );
    case 'de':
      return (
        <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
          <rect width="30" height="6.67" y="0"     fill="#000"/>
          <rect width="30" height="6.67" y="6.67"  fill="#DD0000"/>
          <rect width="30" height="6.67" y="13.33" fill="#FFCE00"/>
        </svg>
      );
  }
}
