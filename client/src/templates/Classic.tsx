import type { ReactNode } from 'react';
import type { CVData } from '../types';

interface Props { cv: CVData; }

const C = {
  ink:      '#1f2937',
  inkSoft:  '#374151',
  inkMuted: '#4b5563',
  inkDim:   '#6b7280',
  rule:     '#d1d5db',
  white:    '#ffffff',
};

function Bullets({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul style={{ marginTop: 6, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {lines.map((l, i) => (
        <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: C.inkSoft, listStyle: 'disc' }}>{l}</li>
      ))}
    </ul>
  );
}

export function ClassicTemplate({ cv }: Props) {
  const accent = cv.accentColor || '#1f2937';
  const { personal: p } = cv;

  return (
    <div className="cv-surface" style={{
      fontFamily: '"Fraunces", "Source Serif Pro", Georgia, serif',
      color: C.ink, background: C.white,
      padding: '44px 56px', minHeight: 1123,
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', paddingBottom: 18, borderBottom: `2px solid ${accent}` }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.1, color: C.ink }}>
          {p.fullName || 'O teu nome'}
        </h1>
        {p.headline && (
          <p style={{ fontSize: 14, color: C.inkMuted, marginTop: 4, fontStyle: 'italic' }}>{p.headline}</p>
        )}
        <div style={{
          marginTop: 10, fontSize: 11.5, color: C.inkDim,
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 14px',
        }}>
          {[p.email, p.phone, p.location, p.website, p.linkedin, p.github]
            .filter(Boolean)
            .map((v, i, arr) => (
              <span key={i}>
                {v}
                {i < arr.length - 1 && <span style={{ marginLeft: 14, color: C.rule }}>·</span>}
              </span>
            ))}
        </div>
      </header>

      {cv.summary && (
        <Section title="Sumário" accent={accent}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: C.inkSoft, whiteSpace: 'pre-wrap' }}>{cv.summary}</p>
        </Section>
      )}

      {cv.experience.length > 0 && (
        <Section title="Experiência Profissional" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cv.experience.map((it) => (
              <div key={it.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{it.role || '—'}</div>
                  <div style={{ fontSize: 11.5, color: C.inkDim, fontStyle: 'italic' }}>
                    {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, fontStyle: 'italic' }}>
                  {it.company}{it.location ? `, ${it.location}` : ''}
                </div>
                <Bullets text={it.description} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {cv.education.length > 0 && (
        <Section title="Formação" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cv.education.map((it) => (
              <div key={it.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{it.degree}</div>
                  <div style={{ fontSize: 11.5, color: C.inkDim, fontStyle: 'italic' }}>
                    {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, fontStyle: 'italic' }}>
                  {it.institution}{it.location ? `, ${it.location}` : ''}
                </div>
                {it.description && (
                  <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{it.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {cv.skills.length > 0 && (
        <Section title="Competências" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cv.skills.map((g) => (
              <div key={g.id} style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>
                {g.category && <strong style={{ fontWeight: 600, color: C.ink }}>{g.category}: </strong>}
                <span>{g.items}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {cv.projects.length > 0 && (
        <Section title="Projetos" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cv.projects.map((proj) => (
              <div key={proj.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{proj.name}</div>
                  {proj.url && <div style={{ fontSize: 11.5, color: C.inkDim, fontStyle: 'italic' }}>{proj.url}</div>}
                </div>
                {proj.stack && <div style={{ fontSize: 11.5, color: C.inkDim, fontStyle: 'italic' }}>{proj.stack}</div>}
                {proj.description && <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{proj.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {cv.languages.length > 0 && (
        <Section title="Idiomas" accent={accent}>
          <div style={{ fontSize: 13, color: C.inkSoft }}>
            {cv.languages.map((l, i) => (
              <span key={l.id}>
                <strong style={{ color: C.ink }}>{l.name}</strong>
                {l.level && <span style={{ color: C.inkDim, fontStyle: 'italic' }}> ({l.level})</span>}
                {i < cv.languages.length - 1 && <span style={{ color: C.rule }}>{'  ·  '}</span>}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{
        fontFamily: '"Fraunces", Georgia, serif',
        fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.22em',
        fontWeight: 600, color: accent, marginBottom: 6,
      }}>{title}</h2>
      <div style={{ height: 1, width: '100%', background: '#e5e7eb', marginBottom: 10 }} />
      {children}
    </section>
  );
}
