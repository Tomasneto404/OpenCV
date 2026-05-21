import { useEffect } from 'react';

interface Bindings {
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Global Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y (redo).
 * Intercepts inside inputs too — our debounced history is more useful here
 * than the browser's per-field undo.
 */
export function useKeyboardShortcuts({ onUndo, onRedo }: Bindings) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo]);
}
