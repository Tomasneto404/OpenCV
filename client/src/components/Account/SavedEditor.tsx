import { useEffect, useState, useRef } from 'react';
import { accountRequest, type SavedCV } from '../../accounts';
import { useAccountCopy, accountErrorMessage } from '../../i18n/accounts';
import { useCV } from '../../state/useCV';
import { useCopy } from '../../i18n/workspace';
import { useT } from '../../i18n';
import { Builder } from '../Builder';
import { downloadPdf } from '../../utils/pdf';
import { slugify } from '../../utils/download';
import { sampleCVByLocale } from '../../utils/sampleCvByLocale';
import { useToast } from '../Toast';

export function SavedEditor({ id, onNavigate, guard }: { id: string; onNavigate: (path: string) => void; guard: (dirty: boolean) => void }) {
  const state = useCV({ persist: false });
  const c = useAccountCopy(); const w = useCopy(); const { locale } = useT(); const toast = useToast();
  const [saved, setSaved] = useState<SavedCV | null>(null);
  const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [exporting, setExporting] = useState(false);
  const [reload, setReload] = useState(0);
  const latest = useRef({ cv: state.cv, title });
  latest.current = { cv: state.cv, title };
  const dirty = !!saved && (title !== saved.title || JSON.stringify(state.cv) !== JSON.stringify(saved.cv));
  useEffect(() => { guard(dirty); return () => guard(false); }, [dirty, guard]);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    accountRequest<SavedCV>(`/cvs/${id}`).then(value => { if (active) { setSaved(value); setTitle(value.title); state.initialize(value.cv); } }).catch(cause => { if (active) setError(accountErrorMessage(cause, c)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Loading a document is independent of UI language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reload]);
  if (loading || !saved) return <main className="account-page"><button className="btn-link" onClick={() => onNavigate('/account')}>← {c.library}</button><p role={error ? 'alert' : 'status'}>{error || c.loading}</p>{error && <button className="btn-ghost" onClick={() => setReload(n => n + 1)}>{c.retry}</button>}</main>;
  const save = async (copy: boolean) => {
    setBusy(true); setError('');
    const payload = { title, cv: state.cv, revision: saved.revision };
    try {
      const next = await accountRequest<SavedCV>(copy ? '/cvs' : `/cvs/${id}`, copy ? 'POST' : 'PUT', payload);
      if (copy) {
        if (JSON.stringify(latest.current) === JSON.stringify({ cv: payload.cv, title: payload.title })) { guard(false); onNavigate(`/builder/${next.id}`); }
        else toast.push({ kind: 'success', title: c.savedNotice });
      }
      else { setSaved(next); toast.push({ kind: 'success', title: c.savedNotice }); }
    } catch (cause) { setError(accountErrorMessage(cause, c)); }
    finally { setBusy(false); }
  };
  return <Builder cv={state.cv} onChange={state.replace} onLoadConfig={state.load} onBack={() => onNavigate('/account')}
    onExport={async () => { setExporting(true); try { await downloadPdf(state.cv, `${slugify(state.cv.personal.fullName)}-cv.pdf`); } catch (cause) { toast.push({ kind: 'error', title: w.exportError, body: (cause as Error).message }); } finally { setExporting(false); } }}
    exporting={exporting} onUndo={state.undo} onRedo={state.redo} onClear={state.clear} canUndo={state.canUndo} canRedo={state.canRedo} saving={false} saveError={false} saveLabel={dirty ? c.unsaved : c.saved} draftHint={c.privateHint}
    onLoadSample={() => state.load(sampleCVByLocale(locale))}
    accountAction={<button className="btn-ghost account-nav-button" onClick={() => onNavigate('/account')}>{c.library}</button>}
    accountPanel={<div className="account-save-panel">
      <label>{c.title}<input className="field" value={title} maxLength={120} onChange={event => setTitle(event.target.value)} /></label>
      <p role="status">{busy ? c.saving : dirty ? c.unsaved : c.saved}</p>
      {error && <p role="alert" className="notice error">{error}</p>}
      <div className="account-save-actions"><button className="btn-primary" disabled={busy || !title.trim()} onClick={() => void save(false)}>{busy ? c.saving : c.update}</button><button className="btn-ghost" disabled={busy || !title.trim()} onClick={() => void save(true)}>{c.copy}</button></div>
    </div>}
  />;
}
