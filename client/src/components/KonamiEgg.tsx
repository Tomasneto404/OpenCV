import { useEffect, useRef } from 'react';
import { useCopy } from '../i18n/workspace';
import { DEVELOPER_GITHUB_URL } from '../utils/developer';
import { Flag } from './LanguageSwitcher';

const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function KonamiEgg() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const c = useCopy();

  useEffect(() => {
    let entered: string[] = [];
    let lastKeyAt = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      // Keep normal editing and keyboard shortcuts independent of the secret.
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
          (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'))) {
        entered = [];
        return;
      }
      if (event.key === 'Shift' || event.repeat || dialogRef.current?.open) return;
      const now = performance.now();
      if (now - lastKeyAt > 8000) entered = [];
      lastKeyAt = now;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      entered = [...entered, key].slice(-SEQUENCE.length);
      if (entered.length === SEQUENCE.length && SEQUENCE.every((expected, i) => entered[i] === expected)) {
        entered = [];
        dialogRef.current?.showModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <dialog ref={dialogRef} className="developer-egg" aria-labelledby="developer-credit">
      <button type="button" className="icon-button developer-egg-close" aria-label={c.close} autoFocus onClick={() => dialogRef.current?.close()}>×</button>
      <span className="developer-flag" role="img" aria-label="Portugal"><Flag code="pt" /></span>
      <p className="developer-code" aria-hidden="true">↑ ↑ ↓ ↓ ← → ← → B A</p>
      <h2 id="developer-credit">
        <a href={DEVELOPER_GITHUB_URL} target="_blank" rel="noopener noreferrer">
          Engineered by <strong>Tomás Neto</strong> in Portugal
        </a>
      </h2>
    </dialog>
  );
}
