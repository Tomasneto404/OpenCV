/**
 * ThemeToggle — small button in the nav to flip light/dark.
 *
 * The theme attribute is set on <html> very early by an inline script in
 * index.html (avoids FOUC). This component only flips it at runtime and
 * persists the choice to localStorage('cveaver:theme'). When the user has
 * never chosen, the inline script falls back to prefers-color-scheme.
 */
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('cveaver:theme', theme); } catch { /* quota */ }
  }, [theme]);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={next === 'dark' ? 'Dark mode' : 'Light mode'}
      aria-label={`Switch to ${next} mode`}
      className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] hover:bg-[color:var(--color-field-hover)] transition text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
    >
      {theme === 'dark' ? (
        // sun icon
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // moon icon
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
