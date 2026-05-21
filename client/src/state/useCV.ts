import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CVData } from '../types';
import { emptyCV } from '../types';

const STORAGE_KEY = 'cveaver:draft';
const MAX_HISTORY = 50;
const COMMIT_DEBOUNCE_MS = 600;

interface History {
  past: CVData[];
  present: CVData;
  future: CVData[];
}

function loadDraft(): CVData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCV();
    const parsed = JSON.parse(raw) as CVData;
    if (parsed?.version === 1) return parsed;
  } catch { /* ignore */ }
  return emptyCV();
}

function sameShape(a: CVData, b: CVData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useCV() {
  const [history, setHistory] = useState<History>(() => ({
    past: [], present: loadDraft(), future: [],
  }));
  const [saving, setSaving] = useState(false);

  const committedRef  = useRef<CVData>(history.present);
  const persistTimer  = useRef<number | undefined>(undefined);
  const commitTimer   = useRef<number | undefined>(undefined);
  const firstRenderRef = useRef(true);

  // ── Persist (localStorage) ─────────────────────────────
  useEffect(() => {
    if (firstRenderRef.current) { firstRenderRef.current = false; return; }
    setSaving(true);
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present)); } catch { /* quota */ }
      setSaving(false);
    }, 250);
    return () => { if (persistTimer.current) window.clearTimeout(persistTimer.current); };
  }, [history.present]);

  // ── Commit pending edits to history ────────────────────
  const commitNow = useCallback(() => {
    setHistory((h) => {
      if (sameShape(h.present, committedRef.current)) return h;
      const newPast = [...h.past, committedRef.current].slice(-MAX_HISTORY);
      committedRef.current = h.present;
      return { past: newPast, present: h.present, future: [] };
    });
  }, []);

  // ── Mutations ──────────────────────────────────────────
  const replace = useCallback((next: CVData) => {
    setHistory((h) => ({ ...h, present: next }));
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(commitNow, COMMIT_DEBOUNCE_MS);
  }, [commitNow]);

  const undo = useCallback(() => {
    if (commitTimer.current) { window.clearTimeout(commitTimer.current); commitTimer.current = undefined; }
    setHistory((h) => {
      // Flush any pending edits to past first
      let { past, present, future } = h;
      if (!sameShape(present, committedRef.current)) {
        past = [...past, committedRef.current].slice(-MAX_HISTORY);
      }
      if (past.length === 0) return h;
      const newPresent = past[past.length - 1];
      const newPast    = past.slice(0, -1);
      const newFuture  = [present, ...future].slice(0, MAX_HISTORY);
      committedRef.current = newPresent;
      return { past: newPast, present: newPresent, future: newFuture };
    });
  }, []);

  const redo = useCallback(() => {
    if (commitTimer.current) { window.clearTimeout(commitTimer.current); commitTimer.current = undefined; }
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      const newPast = [...h.past, h.present].slice(-MAX_HISTORY);
      committedRef.current = next;
      return { past: newPast, present: next, future: rest };
    });
  }, []);

  const clear = useCallback(() => {
    if (commitTimer.current) { window.clearTimeout(commitTimer.current); commitTimer.current = undefined; }
    const fresh = emptyCV();
    setHistory((h) => {
      let past = h.past;
      if (!sameShape(h.present, committedRef.current)) {
        past = [...past, committedRef.current].slice(-MAX_HISTORY);
      }
      past = [...past, h.present].slice(-MAX_HISTORY);
      committedRef.current = fresh;
      return { past, present: fresh, future: [] };
    });
  }, []);

  /** Reset everything, including history. Used after payment completes. */
  const hardReset = useCallback(() => {
    if (commitTimer.current) { window.clearTimeout(commitTimer.current); commitTimer.current = undefined; }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const fresh = emptyCV();
    committedRef.current = fresh;
    setHistory({ past: [], present: fresh, future: [] });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return useMemo(() => ({
    cv: history.present,
    replace,
    undo,
    redo,
    clear,
    hardReset,
    canUndo,
    canRedo,
    saving,
  }), [history.present, replace, undo, redo, clear, hardReset, canUndo, canRedo, saving]);
}
