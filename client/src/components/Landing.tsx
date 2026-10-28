import { useState, type ReactNode } from 'react';
import type { CVData, TemplateId } from '../types';
import { useCopy } from '../i18n/workspace';
import { UploadCV } from './UploadCV';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { galleryOrder, TemplateMiniature, templateCategories } from './TemplatePicker';
import { TEMPLATES } from '../templates';
import { DEVELOPER_GITHUB_URL } from '../utils/developer';
interface Props { accountAction?: ReactNode; onNew: (id?: TemplateId) => void; onResume: () => void; hasDraft: boolean; onSample: () => void; onLoadConfig: (cv: CVData) => void; onNavigate: (path: string) => void; }
export function Landing({ accountAction, onNew, onResume, hasDraft, onSample, onLoadConfig, onNavigate }: Props) {
  const c = useCopy();
  const [filter, setFilter] = useState<'all' | 'clean' | 'expressive' | 'formal'>('all');
  return <div className="landing">
    <header className="site-nav"><a href="/" aria-label="OpenCV"><BrandMark withWordmark size={34} /></a>
      <nav className="site-links"><a href="#templates">{c.templates}</a><a href="#how-it-works">{c.how}</a></nav>
      <div className="nav-actions"><ThemeToggle /><LanguageSwitcher />{accountAction}<button className="btn-primary nav-start" onClick={() => hasDraft ? onResume() : onNew()}>{hasDraft ? c.resume : c.start}<span>↗</span></button></div>
    </header>
    <main>
      <section className="hero page-width">
        <div className="hero-copy"><p className="eyebrow"><span className="status-dot" />{c.eyebrow}</p><h1>{c.hero}<br/><em>{c.heroAccent}</em></h1><p className="hero-intro">{c.intro}</p>
          <div className="hero-buttons"><button className="btn-primary btn-large" onClick={() => hasDraft ? onResume() : onNew()}>{hasDraft ? c.resume : c.start}<span>↗</span></button><button className="btn-ghost btn-large" onClick={onSample}>{c.sample}<span>→</span></button></div>
          <div className="trust-line"><span>✓ {c.free}</span><span>✓ {c.noAccount}</span><span>✓ {c.noWatermark}</span></div>
          <UploadCV hasDraft={hasDraft} onLoad={onLoadConfig} />
        </div>
        <div className="hero-art"><div className="hero-orbit"/><div className="hero-paper"><TemplateMiniature id="studio" /></div><div className="hero-note"><span className="note-check">✓</span><div><strong>{c.free}</strong><span>{c.footerNote}</span></div></div><span className="hero-art-caption">{c.eyebrow}</span></div>
      </section>
      <section id="templates" className="gallery-section"><div className="page-width"><div className="section-heading"><div><p className="eyebrow">{c.galleryEyebrow}</p><h2>{c.galleryTitle}</h2><p>{c.galleryBody}</p></div><span className="template-count">09 <span>{c.templates}</span></span></div>
        <div className="filter-tabs" role="group" aria-label={c.templates}>{(['all', 'clean', 'expressive', 'formal'] as const).map(key => <button key={key} onClick={() => setFilter(key)} className={filter === key ? 'active' : ''} aria-pressed={filter === key}>{c[key]}<span>{key === 'all' ? 9 : galleryOrder.filter(id => templateCategories[id] === key).length}</span></button>)}</div>
        <div className="gallery-grid">{galleryOrder.filter(id => filter === 'all' || templateCategories[id] === filter).map((id, i) => <button key={id} className="gallery-card" onClick={() => onNew(id)} aria-label={`${c.choose}: ${TEMPLATES[id].label}`}><div className="gallery-thumbnail"><TemplateMiniature id={id} />{['studio', 'technical', 'academic', 'compact'].includes(id) && <span className="new-tag">{c.new}</span>}<span className="choose-tag">{c.choose} ↗</span></div><div className="gallery-card-title"><div><h3>{TEMPLATES[id].label}</h3><p>{c[templateCategories[id]]}</p></div><span className="card-number">{String(i + 1).padStart(2, '0')} ↗</span></div></button>)}</div>
      </div></section>
      <section id="how-it-works" className="how-section page-width"><p className="eyebrow">01 → 02 → 03</p><h2>{c.stepTitle}</h2><div className="steps-grid">{c.steps.map((s, i) => <div key={s}><span className="step-number">0{i+1}</span><h3>{s}</h3><p>{c.stepBodies[i]}</p></div>)}</div></section>
    </main>
    <footer className="site-footer page-width"><div><BrandMark withWordmark /><p>{c.footer}</p></div><a className="footer-credit" href={DEVELOPER_GITHUB_URL} target="_blank" rel="noopener noreferrer">Developed with care by <strong>Tomás Neto</strong></a><button className="btn-link" onClick={() => onNavigate('/privacy')}>{c.privacy} ↗</button><span>© {new Date().getFullYear()} OpenCV</span></footer>
  </div>;
}
