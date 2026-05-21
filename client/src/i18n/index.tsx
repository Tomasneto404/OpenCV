/**
 * Tiny i18n runtime.
 *
 * Design notes:
 *  - No 3rd-party dep — the runtime is ~50 lines and only does what we need.
 *  - All five dictionaries are statically imported. Total cost ≈ 12 KB gzipped.
 *    We tried lazy-loading but the round-trip when switching language caused
 *    flicker; keeping them static is simpler.
 *  - t('a.b.c') returns the string at that dot-path. Missing key → key itself
 *    (so we see broken keys obviously during dev rather than silently empty).
 *  - t('foo.bar', { name: 'Ana' }) substitutes {name} → 'Ana'.
 *  - The chosen locale is persisted in localStorage. On first visit we try
 *    navigator.language; falling back to 'pt' (project-wide convention).
 *
 * Adding a new key: add it to ./pt.ts (source-of-truth). TS will then flag the
 * missing entries in en/es/fr/de.ts. Translate, done.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dict as pt } from './pt';
import { dict as en } from './en';
import { dict as es } from './es';
import { dict as fr } from './fr';
import { dict as de } from './de';
import type { Dict, Locale, TPath } from './types';

/**
 * Cast: pt is `as const` (readonly) but Dict is the widened, mutable shape.
 * Runtime values are identical; only the TS view differs.
 */
const DICTIONARIES: Record<Locale, Dict> = {
  pt: pt as unknown as Dict,
  en,
  es,
  fr,
  de,
};

export const SUPPORTED_LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'en', label: 'English',    native: 'English' },
  { code: 'es', label: 'Spanish',    native: 'Español' },
  { code: 'fr', label: 'French',     native: 'Français' },
  { code: 'de', label: 'German',     native: 'Deutsch' },
];

const STORAGE_KEY = 'cveaver:locale';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'pt';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && DICTIONARIES[stored]) return stored;
  const browser = (navigator.language || 'pt').toLowerCase().slice(0, 2);
  return (DICTIONARIES[browser as Locale] ? (browser as Locale) : 'pt');
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate by dot-path. Optional `vars` substitutes {placeholders}. */
  t: (path: TPath, vars?: Record<string, string | number>) => string;
  /** Lookup raw value (string or array/object) — used for FAQ items etc. */
  raw: <T = unknown>(path: TPath) => T;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, locale); } catch { /* quota */ }
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const dict = DICTIONARIES[locale];

  const lookup = useCallback((path: string): unknown => {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, dict);
  }, [dict]);

  const t = useCallback((path: TPath, vars?: Record<string, string | number>): string => {
    const value = lookup(path);
    if (typeof value !== 'string') return String(path);
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
  }, [lookup]);

  const raw = useCallback(<T,>(path: TPath): T => lookup(path) as T, [lookup]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t, raw }), [locale, setLocale, t, raw]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

/**
 * Convenience hook for the most common usage: just t() + locale.
 *
 *   const { t } = useT();
 */
export function useT() {
  const ctx = useI18n();
  return { t: ctx.t, locale: ctx.locale };
}
