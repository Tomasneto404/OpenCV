import { useEffect, useRef, useState } from 'react';
import type { CVData } from '../types';
import { PersonalSection } from './Form/PersonalSection';
import { SummarySection } from './Form/SummarySection';
import { ExperienceSection } from './Form/ExperienceSection';
import { EducationSection } from './Form/EducationSection';
import { SkillsSection } from './Form/SkillsSection';
import { LanguagesSection } from './Form/LanguagesSection';
import { ProjectsSection } from './Form/ProjectsSection';
import { CertificatesSection } from './Form/CertificatesSection';
import { TemplatePicker } from './TemplatePicker';
import { Preview } from './Preview';
import { UploadCV } from './UploadCV';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { sectionStatus, isCvEmpty, type SectionKey } from '../utils/completion';
import { downloadConfig, slugify } from '../utils/download';
import { useT } from '../i18n';
import { useCopy } from '../i18n/workspace';
import { TEMPLATES } from '../templates';
interface Props {
  cv: CVData; onLoadConfig: (cv: CVData) => void; onChange: (next: CVData) => void; onBack: () => void;
  onExport: () => void; exporting: boolean; onUndo: () => void; onRedo: () => void; onClear: () => void;
  canUndo: boolean; canRedo: boolean; saving: boolean; saveError: boolean; onLoadSample: () => void;
}
const sections: SectionKey[] = ['personal', 'summary', 'experience', 'education', 'skills', 'languages', 'projects', 'certificates'];
const icons = ['◉', '≡', '▣', '◇', '✧', '◎', '▧', '▤'];
export function Builder({ cv, onLoadConfig, onChange, onBack, onExport, exporting, onUndo, onRedo, onClear, canUndo, canRedo, saving, saveError, onLoadSample }: Props) {
  const [active, setActive] = useState<SectionKey>('personal');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(.7);
  const previewRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useT(); const c = useCopy();
  useKeyboardShortcuts({ onUndo, onRedo });
  useEffect(() => {
    const el = previewRef.current; if (!el) return;
    const fit = () => setZoom(Math.min(.88, Math.max(.2, (el.clientWidth - 64) / 794)));
    const observer = new ResizeObserver(fit); observer.observe(el); fit(); return () => observer.disconnect();
  }, []);
  useEffect(() => { if (previewOpen) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [previewOpen]);
  const patch = <K extends keyof CVData>(key: K, value: CVData[K]) => onChange({ ...cv, [key]: value });
  const handleRestart = () => {
    if (!window.confirm(t('builder.actions.clearConfirm'))) return;
    onClear();
    setActive('personal');
    setPreviewOpen(false);
    if (formRef.current) formRef.current.scrollTop = 0;
    const preview = previewRef.current?.querySelector('.preview-scroll');
    if (preview) preview.scrollTop = 0;
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLInputElement>('#personal-fullName')?.focus({ preventScroll: true });
    });
  };
  const filled = sections.filter(key => sectionStatus(cv, key).state === 'filled').length;
  const index = sections.indexOf(active);
  const downloadButton = <button className="btn-primary" disabled={exporting || !cv.personal.fullName.trim()} onClick={onExport} title={!cv.personal.fullName.trim() ? c.nameHint : undefined}>{exporting ? <span className="spinner"/> : <span>↓</span>}{exporting ? c.exporting : c.export}</button>;
  return <div className="builder-shell">
    <header className="editor-nav"><div className="editor-brand"><button className="icon-button" onClick={onBack} aria-label={c.back}>←</button><BrandMark withWordmark size={30} /><span className="nav-divider"/><span className="editor-document-name">{cv.personal.fullName || c.editor}</span></div>
      <div className="editor-actions"><span className={`save-status ${saveError ? 'error' : ''}`} role="status"><span className="status-dot"/>{saveError ? '!' : saving ? c.saving : c.saved}</span><ThemeToggle /><LanguageSwitcher /><div className="desktop-export">{downloadButton}</div></div>
    </header>
    <div className="editor-layout">
      <aside className="section-sidebar"><div className="sidebar-heading"><p className="eyebrow">{c.content}</p><span>{filled}/{sections.length}</span></div><div className="progress-track"><span style={{ width: `${filled / sections.length * 100}%` }}/></div>
        <nav className="section-navigation" aria-label={c.content}>{sections.map((key, i) => <button key={key} onClick={() => setActive(key)} className={active === key ? 'active' : ''} aria-current={active === key ? 'step' : undefined}><span className="section-icon">{icons[i]}</span><span>{t(`builder.sections.${key}`)}</span><span className={`section-state ${sectionStatus(cv,key).state === 'filled' ? 'filled' : ''}`}>{sectionStatus(cv,key).state === 'filled' ? '✓' : String(i+1).padStart(2,'0')}</span></button>)}
        <button className={`design-nav ${active === 'template' ? 'active' : ''}`} onClick={() => setActive('template')}><span className="section-icon">▦</span><span>{c.design}</span><span>↗</span></button></nav>
        <div className="sidebar-bottom"><p>{c.localHint}</p><button className="btn-ghost" onClick={() => downloadConfig(cv, `${slugify(cv.personal.fullName)}-opencv.json`)}>↧ {c.backup}</button></div>
      </aside>
      <main className="form-pane" ref={formRef}><div className="form-heading"><div><p className="eyebrow">{active === 'template' ? c.design : `0${index + 1} / 08`}</p><h1>{t(`builder.sections.${active}`)}</h1></div><div className="history-actions"><button type="button" className="btn-ghost editor-reset" onClick={handleRestart}><span aria-hidden="true">↺</span>{t('builder.actions.clear')}</button><button className="icon-button" onClick={onUndo} disabled={!canUndo} aria-label={t('builder.actions.undo')} title={t('builder.actions.undo')}>↶</button><button className="icon-button" onClick={onRedo} disabled={!canRedo} aria-label={t('builder.actions.redo')} title={t('builder.actions.redo')}>↷</button></div></div>
        <UploadCV hasDraft={!isCvEmpty(cv)} onLoad={next => {
          onLoadConfig(next);
          setActive('personal');
          if (formRef.current) formRef.current.scrollTop = 0;
          const preview = previewRef.current?.querySelector('.preview-scroll');
          if (preview) preview.scrollTop = 0;
        }} />
        {saveError && <p role="alert" className="notice error">{c.saveError}</p>}
        {isCvEmpty(cv) && <div className="notice"><p>{c.nameHint}</p><button className="btn-link" onClick={onLoadSample}>{c.sample} →</button></div>}
        <div className="section-form" key={active}>
          {active === 'template' && <TemplatePicker value={cv.template} onChange={value => patch('template', value)} />}
          {active === 'personal' && <PersonalSection value={cv.personal} onChange={v => patch('personal',v)} accentColor={cv.accentColor} onAccentChange={v => patch('accentColor',v)} />}
          {active === 'summary' && <SummarySection value={cv.summary} onChange={v => patch('summary',v)} />}
          {active === 'experience' && <ExperienceSection items={cv.experience} onChange={v => patch('experience',v)} />}
          {active === 'education' && <EducationSection items={cv.education} onChange={v => patch('education',v)} />}
          {active === 'skills' && <SkillsSection items={cv.skills} onChange={v => patch('skills',v)} />}
          {active === 'languages' && <LanguagesSection items={cv.languages} onChange={v => patch('languages',v)} />}
          {active === 'projects' && <ProjectsSection items={cv.projects} onChange={v => patch('projects',v)} />}
          {active === 'certificates' && <CertificatesSection items={cv.certificates} onChange={v => patch('certificates',v)} />}
        </div>
        <div className="section-footer"><button className="btn-link" disabled={index <= 0} onClick={() => setActive(sections[index-1])}>← {c.previous}</button><button className="btn-ghost" onClick={() => setActive(active === 'template' ? 'personal' : index === sections.length-1 ? 'template' : sections[index+1])}>{active === 'template' ? t('builder.sections.personal') : index === sections.length-1 ? c.design : c.next} →</button></div>
        <button className="btn-ghost mobile-backup" onClick={() => downloadConfig(cv, `${slugify(cv.personal.fullName)}-opencv.json`)}>↧ {c.backup}</button>
      </main>
      <div className="preview-pane" ref={previewRef}><div className="preview-toolbar"><div><span className="status-dot"/><strong>{c.preview}</strong><span className="preview-live">{c.live}</span></div><span className="preview-format">A4 · {TEMPLATES[cv.template].label}</span></div><div className="preview-scroll" role="region" aria-label={c.preview} tabIndex={0}><Preview cv={cv} zoom={zoom}/><p className="preview-footnote">{c.previewHint}</p></div></div>
    </div>
    <div className="mobile-editor-bar"><button className="btn-ghost" onClick={() => setPreviewOpen(true)}>{c.preview} ↗</button>{downloadButton}</div>
    <dialog ref={dialogRef} className="preview-dialog" onCancel={() => setPreviewOpen(false)} onClose={() => setPreviewOpen(false)}><div className="dialog-toolbar"><strong>{c.preview}</strong><button className="btn-ghost" onClick={() => setPreviewOpen(false)}>{c.close} ×</button></div><div className="dialog-preview"><Preview cv={cv} zoom={Math.min(.8, (window.innerWidth-48)/794)} /></div></dialog>
  </div>;
}
