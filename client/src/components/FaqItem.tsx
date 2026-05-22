/**
 * Shared accordion item used in the Landing FAQ teaser and the /faq page.
 *
 * Why custom (instead of <details>/<summary>): the native element opens
 * instantly with no easing, and the trigger isn't a fixed height — long
 * questions made the rail look uneven. This version:
 *
 *   - Fixed header height (56 px) so closed rows align uniformly.
 *   - Body slides open with the `grid-template-rows: 0fr → 1fr` trick,
 *     which transitions cleanly because grid track sizes are interpolable
 *     in modern engines. No measuring or JS height computation needed.
 *   - The "+" rotates 45° into an "×" with the same easing curve.
 *   - Respects prefers-reduced-motion via .animate-rise's media query in
 *     index.css (we re-use the same cubic-bezier for visual consistency).
 */
import { useId, useState, type ReactNode } from 'react';

interface Props {
  q: string;
  children: ReactNode;
  /** Optional id — useful if you ever want to deep-link an open question. */
  initialOpen?: boolean;
}

export function FaqItem({ q, children, initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const bodyId = useId();

  return (
    <div
      className={[
        'faq-item rounded-2xl border transition-colors duration-200',
        open
          ? 'border-[color:var(--color-border-strong)] bg-[color:var(--color-glass-bg)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] hover:border-[color:var(--color-border-strong)]',
      ].join(' ')}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between gap-4 px-5 h-14 text-[15px] font-medium text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-brand-400)] rounded-2xl"
      >
        <span className="truncate">{q}</span>
        <span
          aria-hidden
          className="text-[color:var(--color-ink-faint)] text-xl leading-none select-none"
          style={{
            transition: 'transform .35s cubic-bezier(.4, 0, .2, 1)',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          +
        </span>
      </button>

      <div
        id={bodyId}
        className="grid"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows .35s cubic-bezier(.4, 0, .2, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 text-[14px] text-[color:var(--color-ink-muted)] leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
