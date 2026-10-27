import type { CSSProperties, ReactNode } from 'react';
import type { CVData } from '../types';
import { labelsForLocale } from '../utils/cvLabels';

/** Four complete layouts sharing content structure, with distinct typography and hierarchy. */
export function EditorialTemplate({ cv }: { cv: CVData }) {
  const { template: variant, personal: p, accentColor: accent } = cv;
  const compact = variant === 'compact';
  const academic = variant === 'academic';
  const technical = variant === 'technical';
  const L = labelsForLocale(cv.locale).sections;
  const contacts = [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean);
  const heading: CSSProperties = { fontSize: compact ? 11 : 12, fontWeight: 700, color: accent, letterSpacing: technical ? 0 : '0.14em', textTransform: 'uppercase', borderBottom: `1px solid ${accent}40`, paddingBottom: 7, margin: '0 0 12px', fontFamily: technical ? 'monospace' : 'inherit' };
  const block = (title: string, children: ReactNode) => <section style={{ marginBottom: compact ? 16 : 24 }}><h2 style={heading}>{title}</h2>{children}</section>;
  const detail: CSSProperties = { fontSize: compact ? 11.5 : 13, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line', margin: '5px 0 0' };
  const education = cv.education.length > 0 && block(L.education, cv.education.map(it => <div key={it.id} style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><strong>{it.degree}</strong><span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{it.startDate}{it.endDate && ` — ${it.endDate}`}</span></div>
    <div style={{ color: accent, fontSize: 12, marginTop: 3 }}>{[it.institution, it.location].filter(Boolean).join(' · ')}</div>
    {it.description && <p style={detail}>{it.description}</p>}
  </div>));
  return <article className="cv-surface" style={{ padding: compact ? '36px 44px' : '52px 58px', color: '#192f32', background: 'white', fontSize: compact ? 12 : 14, fontFamily: academic || variant === 'studio' ? 'Georgia, serif' : 'Arial, sans-serif', lineHeight: 1.5 }}>
    <header style={{ display: 'flex', flexDirection: academic ? 'column' : 'row', alignItems: academic ? 'center' : 'flex-start', gap: 24, textAlign: academic ? 'center' : 'left', marginBottom: compact ? 20 : 30, padding: technical ? 24 : 0, background: technical ? '#192f32' : 'transparent', color: technical ? 'white' : '#192f32', borderBottom: variant === 'studio' ? `4px solid ${accent}` : academic ? `1px solid ${accent}` : undefined, paddingBottom: compact ? 12 : 26 }}>
      <div style={{ flex: 1 }}><h1 style={{ fontSize: compact ? 30 : academic ? 34 : 44, fontWeight: variant === 'studio' ? 400 : 700, letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0 }}>{p.fullName || '—'}</h1>
        {p.headline && <p style={{ fontFamily: 'Arial, sans-serif', fontSize: 14, margin: '10px 0', color: technical ? '#bfe6db' : accent }}>{p.headline}</p>}
        <div style={{ display: 'flex', justifyContent: academic ? 'center' : 'flex-start', flexWrap: 'wrap', gap: '4px 16px', fontSize: 10.5, fontFamily: 'Arial, sans-serif', opacity: .8, overflowWrap: 'anywhere' }}>{contacts.map((c,i) => <span key={i}>{c}</span>)}</div>
      </div>
      {p.photoDataUrl && <img src={p.photoDataUrl} alt="" style={{ width: compact ? 64 : 80, height: compact ? 64 : 80, objectFit: 'cover', borderRadius: variant === 'studio' ? '50%' : 4 }} />}
    </header>
    {cv.summary && block(L.about, <p style={{ ...detail, margin: 0 }}>{cv.summary}</p>)}
    {academic && education}
    {cv.experience.length > 0 && block(L.experience, cv.experience.map(it => <div key={it.id} style={{ marginBottom: compact ? 12 : 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><strong>{it.role}</strong><span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{it.startDate}{it.endDate && ` — ${it.endDate}`}</span></div>
      <div style={{ color: accent, fontSize: 12, marginTop: 3 }}>{[it.company, it.location].filter(Boolean).join(' · ')}</div>
      {it.description && <p style={detail}>{it.description}</p>}
    </div>))}
    {!academic && education}
    {cv.projects.length > 0 && block(L.projects, cv.projects.map(it => <div key={it.id} style={{ marginBottom: 12 }}><strong>{it.name}</strong>{it.url && <div style={{ fontSize: 11, color: accent }}>{it.url}</div>}{it.description && <p style={detail}>{it.description}</p>}{it.stack && <p style={{ ...detail, fontFamily: technical ? 'monospace' : 'inherit', fontSize: 11 }}>{it.stack}</p>}</div>))}
    <div style={{ display: 'grid', gridTemplateColumns: cv.skills.length && cv.languages.length ? '1.5fr 1fr' : '1fr', gap: 32 }}>
      {cv.skills.length > 0 && block(L.skills, cv.skills.map(it => <p key={it.id} style={detail}><strong>{it.category}{it.category && ': '}</strong>{it.items}</p>))}
      {cv.languages.length > 0 && block(L.languages, cv.languages.map(it => <p key={it.id} style={detail}>{it.name} <span style={{ color: '#64748b' }}>· {it.level}</span></p>))}
    </div>
  </article>;
}
