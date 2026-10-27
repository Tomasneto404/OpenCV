import { useId, useRef, useState } from 'react';
import type { CVData } from '../types';
import { useCopy } from '../i18n/workspace';
import { loadConfigFromFile } from '../utils/loadConfig';
import { useToast } from './Toast';

export function UploadCV({ hasDraft, onLoad }: { hasDraft: boolean; onLoad: (cv: CVData) => void }) {
  const c = useCopy();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [importing, setImporting] = useState(false);

  return <div className="upload-cv" aria-busy={importing}>
    <button type="button" className="upload-cv-button" disabled={importing} aria-describedby={hintId} onClick={() => inputRef.current?.click()}>
      <span className="upload-cv-icon" aria-hidden="true">{importing ? <span className="spinner" /> :
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg>}
      </span>
      <span>{importing ? c.importing : c.import}</span><span className="upload-cv-arrow" aria-hidden="true">↗</span>
    </button>
    <p id={hintId}>{c.importHint}<span className="upload-cv-formats">PDF / JSON · 80 MB</span></p>
    <input ref={inputRef} type="file" aria-label={c.import} accept=".json,.pdf,application/pdf,application/json" hidden disabled={importing} onChange={async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setImporting(true);
      try {
        const { cv } = await loadConfigFromFile(file);
        if (!hasDraft || window.confirm(c.importConfirm)) onLoad(cv);
      } catch (error) {
        toast.push({ kind: 'error', title: c.importError, body: (error as Error).message });
      } finally {
        setImporting(false);
      }
    }} />
  </div>;
}
