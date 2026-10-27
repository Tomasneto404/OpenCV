import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { emptyCV, type CVData } from '../types';
import { normalizeCV } from '../../../shared/normalizeCV';
import { hasPendingEdit, historyReducer, initialHistory } from './history';
const STORAGE_KEY = 'opencv:draft';

function loadDraft(): CVData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('cveaver:draft');
    if (raw) return normalizeCV(JSON.parse(raw)) ?? emptyCV();
  } catch { /* An invalid or unavailable saved draft starts a clean editor. */ }
  return emptyCV();
}
export function useCV() {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => initialHistory(loadDraft()));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const commitTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setSaving(true);
    const persist = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
        setSaveError(false);
      } catch { setSaveError(true); }
      setSaving(false);
    };
    const timer = window.setTimeout(persist, 250);
    const hidden = () => { if (document.visibilityState === 'hidden') persist(); };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [history.present]);

  const cancelCommit = useCallback(() => {
    window.clearTimeout(commitTimer.current);
    commitTimer.current = undefined;
  }, []);
  useEffect(() => cancelCommit, [cancelCommit]);
  const replace = useCallback((cv: CVData) => {
    cancelCommit();
    dispatch({ type: 'replace', cv });
    commitTimer.current = window.setTimeout(() => dispatch({ type: 'commit' }), 600);
  }, [cancelCommit]);
  const undo = useCallback(() => { cancelCommit(); dispatch({ type: 'undo' }); }, [cancelCommit]);
  const redo = useCallback(() => { cancelCommit(); dispatch({ type: 'redo' }); }, [cancelCommit]);
  const load = useCallback((cv: CVData) => { cancelCommit(); dispatch({ type: 'load', cv }); }, [cancelCommit]);
  const clear = useCallback(() => { cancelCommit(); dispatch({ type: 'clear', cv: emptyCV() }); }, [cancelCommit]);
  const hardReset = useCallback(() => { cancelCommit(); dispatch({ type: 'reset', cv: emptyCV() }); }, [cancelCommit]);
  return {
    cv: history.present, replace, load, undo, redo, clear, hardReset,
    canUndo: history.past.length > 0 || hasPendingEdit(history),
    canRedo: history.future.length > 0,
    saving, saveError,
  };
}
