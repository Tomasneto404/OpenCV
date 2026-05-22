/**
 * Browser-level fricção against casual capture attempts.
 *
 * Honestly: none of this is real security. The renderer is server-side
 * (see server/pdf/render.ts) — that's what actually keeps the PDF behind
 * the paywall. This module just makes the obvious shortcuts inconvenient.
 *
 * What we block:
 *   - Ctrl/Cmd + P  → browser print
 *   - Ctrl/Cmd + S  → save page
 *   - Right-click anywhere on the preview surface (handled in Preview.tsx)
 *   - Image / link drag → handled in Preview.tsx
 *
 * What we don't block (and can't):
 *   - OS screenshots (Cmd+Shift+4, PrintScreen, Snipping Tool)
 *   - DevTools "Capture full size screenshot"
 *   - Browser's File menu → Print
 *   - Page Source view
 *
 * Call install() once from main.tsx.
 */

const BLOCKED_KEYS = new Set(['p', 'P', 's', 'S']);

export function installCaptureGuard(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('keydown', (e) => {
    // Cmd+P / Cmd+S on mac, Ctrl+P / Ctrl+S elsewhere.
    if ((e.metaKey || e.ctrlKey) && BLOCKED_KEYS.has(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });

  // beforeprint fires when the browser is about to print (File menu route,
  // etc). We can't fully cancel, but we can dispatch our hidden state via
  // the CSS @media print rule.
  window.addEventListener('beforeprint', (e) => {
    e.preventDefault?.();
  });
}
