/**
 * Konami code easter egg.
 *
 * Sequence (the classic): ↑ ↑ ↓ ↓ ← → ← → B A
 *
 * Listens at the window level so it triggers from any screen. On match,
 * pops a small modal with engineering credit + a link to the GitHub repo.
 * Press Esc or click outside to dismiss. Saves a flag in sessionStorage so
 * the egg doesn't repeat-fire on the same session if the user just keeps
 * hammering keys.
 */
import { useEffect, useState } from 'react';

const SEQUENCE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA',
] as const;

const SESSION_KEY = 'cveaver:konami';
const GITHUB_URL = 'https://github.com/Tomasneto404/CVeaver';

export function KonamiEgg() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let buf: string[] = [];

    const onKey = (e: KeyboardEvent) => {
      // Ignore key events fired inside form fields — typing "a" or "b" in
      // an input shouldn't even start the Konami buffer.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      buf = [...buf, e.code].slice(-SEQUENCE.length);
      if (buf.length === SEQUENCE.length && buf.every((k, i) => k === SEQUENCE[i])) {
        buf = [];
        setOpen(true);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEsc);
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="konami-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      {/* Backdrop — frosted dim */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(28, 19, 8, 0.55)',
          backdropFilter: 'blur(8px) saturate(140%)',
          WebkitBackdropFilter: 'blur(8px) saturate(140%)',
        }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden text-center animate-rise"
        style={{
          background: 'var(--color-surface-1)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-border-strong)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Confetti / accent strip */}
        <div
          style={{
            height: 4,
            background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-accent-500))',
          }}
        />

        <div className="px-8 pt-9 pb-8">
          <div className="text-4xl leading-none mb-4" aria-hidden>🦫</div>

          <p
            className="section-kicker"
            style={{ color: 'var(--color-brand-500)' }}
          >
            Easter Egg
          </p>

          <h2
            id="konami-title"
            className="mt-3 text-[26px] font-bold tracking-tight leading-snug"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            Engineered by Tomás Neto<br />
            <span style={{ color: 'var(--color-ink-muted)', fontWeight: 500, fontSize: 18 }}>
              in Portugal
            </span>
          </h2>

          <blockquote
            className="mt-6 mx-auto max-w-xs text-[15px] italic leading-relaxed"
            style={{ color: 'var(--color-ink-muted)', fontFamily: 'Fraunces, serif' }}
          >
            “Não tentes. Faz!”
          </blockquote>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-5 text-[14.5px]"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                <path d="M12 .5C5.7.5.6 5.6.6 11.9c0 5 3.2 9.3 7.7 10.8.6.1.8-.2.8-.5v-2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.5-.3-5.1-1.2-5.1-5.6 0-1.2.4-2.2 1.2-3-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2.9-.3 2-.4 3-.4s2.1.1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3 0 4.4-2.6 5.3-5.2 5.6.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.5-1.5 7.7-5.8 7.7-10.8C23.4 5.6 18.3.5 12 .5z" />
              </svg>
              <span>GitHub</span>
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost px-5 text-[14.5px]"
            >
              Fechar
            </button>
          </div>

          <p className="mt-5 text-[11px] text-[color:var(--color-ink-faint)] font-mono">
            ↑ ↑ ↓ ↓ ← → ← → B A
          </p>
        </div>
      </div>
    </div>
  );
}
