import { useCallback, useEffect, useState, useRef } from 'react';
import { Landing } from './components/Landing';
import { Builder } from './components/Builder';
import { BrandMark } from './components/BrandMark';
import { useCV } from './state/useCV';
import { emptyCV, type CVData, type TemplateId } from './types';
import { useToast } from './components/Toast';
import { useT } from './i18n';
import { useCopy } from './i18n/workspace';
import { sampleCVByLocale } from './utils/sampleCvByLocale';
import { downloadPdf } from './utils/pdf';
import { slugify } from './utils/download';
import { useAuth } from './components/Account/Auth';
import { Login } from './components/Account/Login';
import { Library } from './components/Account/Library';
import { SavedEditor } from './components/Account/SavedEditor';
import { SavePublicCV } from './components/Account/SavePanel';
import { useAccountCopy } from './i18n/accounts';
import { isCvEmpty } from './utils/completion';

export function App() {
  const state = useCV();
  const auth = useAuth(); const accountCopy = useAccountCopy();
  const dirty = useRef(false);
  const guard = useCallback((value: boolean) => { dirty.current = value; }, []);
  const [path, setPath] = useState(window.location.pathname);
  const [exporting, setExporting] = useState(false);
  const { locale } = useT(); const c = useCopy(); const toast = useToast();
  const navigate = useCallback((next: string) => {
    if (dirty.current && !window.confirm(accountCopy.leave)) return;
    dirty.current = false;
    window.history.pushState({}, '', next); setPath(next); window.scrollTo(0, 0);
  }, [accountCopy.leave]);
  useEffect(() => {
    const pop = () => {
      if (dirty.current && !window.confirm(accountCopy.leave)) { window.history.pushState({}, '', path); return; }
      dirty.current = false; setPath(window.location.pathname);
    };
    const unload = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('popstate', pop); window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('beforeunload', unload); };
  }, [path, accountCopy.leave]);
  const cv = { ...state.cv, locale };
  const start = (template?: TemplateId) => {
    // Keep a current draft when trying a different design from the gallery.
    state.replace({ ...(isCvEmpty(state.cv) ? emptyCV() : state.cv), template: template ?? state.cv.template, locale });
    navigate('/builder');
  };
  const load = (next: CVData) => { state.load(next); navigate('/builder'); };
  const loadSample = () => load(sampleCVByLocale(locale));
  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try { await downloadPdf(cv, `${slugify(cv.personal.fullName)}-cv.pdf`); toast.push({ kind: 'success', title: c.exportSuccess, body: c.exportBody }); }
    catch (err) { toast.push({ kind: 'error', title: c.exportError, body: (err as Error).message }); }
    finally { setExporting(false); }
  };
  const accountAction = <button className="btn-ghost account-nav-button" onClick={() => navigate(auth.user ? '/account' : '/login')}>{auth.user ? accountCopy.library : accountCopy.login}</button>;
  const privateId = path.match(/^\/builder\/([a-zA-Z0-9-]+)$/)?.[1];
  if (path === '/login' || path === '/account' || privateId) {
    if (auth.loading) return <main className="account-page"><p role="status">{accountCopy.loading}</p></main>;
    if (!auth.user) return <Login onNavigate={navigate} />;
    if (privateId) return <SavedEditor key={`${auth.user.id}:${privateId}`} id={privateId} onNavigate={navigate} guard={guard} />;
    return <Library key={auth.user.id} onNavigate={navigate} />;
  }
  if (path === '/builder') return <Builder accountAction={accountAction} accountPanel={<SavePublicCV cv={cv} onLogin={() => navigate('/login')} onSaved={saved => navigate(`/builder/${saved.id}`)} />} cv={cv} onChange={state.replace} onLoadConfig={state.load} onBack={() => navigate('/')} onExport={exportPdf} exporting={exporting} onUndo={state.undo} onRedo={state.redo} onClear={state.clear} canUndo={state.canUndo} canRedo={state.canRedo} saving={state.saving} saveError={state.saveError} onLoadSample={loadSample} />;
  if (path !== '/') return <div className="info-page page-width"><button className="btn-link" onClick={() => navigate('/')}>← {c.back}</button><BrandMark withWordmark /><h1>{path === '/privacy' ? c.privacyTitle : c.helpTitle}</h1><p>{path === '/privacy' ? c.privacyBody : c.helpBody}</p><button className="btn-primary" onClick={() => start()}>{c.start} ↗</button></div>;
  return <Landing accountAction={accountAction} onNew={start} onResume={() => navigate('/builder')} hasDraft={!isCvEmpty(state.cv)} onSample={loadSample} onLoadConfig={load} onNavigate={navigate} />;
}
