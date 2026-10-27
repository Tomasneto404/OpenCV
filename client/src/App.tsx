import { useCallback, useEffect, useState } from 'react';
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
import { isCvEmpty } from './utils/completion';

export function App() {
  const state = useCV();
  const [path, setPath] = useState(window.location.pathname);
  const [exporting, setExporting] = useState(false);
  const { locale } = useT(); const c = useCopy(); const toast = useToast();
  const navigate = useCallback((next: string) => { window.history.pushState({}, '', next); setPath(next); window.scrollTo(0, 0); }, []);
  useEffect(() => { const pop = () => setPath(window.location.pathname); window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);
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
  if (path === '/builder') return <Builder cv={cv} onChange={state.replace} onLoadConfig={state.load} onBack={() => navigate('/')} onExport={exportPdf} exporting={exporting} onUndo={state.undo} onRedo={state.redo} onClear={state.clear} canUndo={state.canUndo} canRedo={state.canRedo} saving={state.saving} saveError={state.saveError} onLoadSample={loadSample} />;
  if (path !== '/') return <div className="info-page page-width"><button className="btn-link" onClick={() => navigate('/')}>← {c.back}</button><BrandMark withWordmark /><h1>{path === '/privacy' ? c.privacyTitle : c.helpTitle}</h1><p>{path === '/privacy' ? c.privacyBody : c.helpBody}</p><button className="btn-primary" onClick={() => start()}>{c.start} ↗</button></div>;
  return <Landing onNew={start} onResume={() => navigate('/builder')} hasDraft={!isCvEmpty(state.cv)} onSample={loadSample} onLoadConfig={load} onNavigate={navigate} />;
}
