/**
 * Executive — premium serif template intended for senior/management roles.
 *
 * Distinguished by:
 *   - Centred header with double-rule above/below the name
 *   - Inline contact strip
 *   - Section headers in small-caps with a thin underline
 *   - Two-column "Skills + Languages" tail
 *
 * Renders on screen via this component AND in PDF via ExecutivePdf.tsx.
 */
import type { ReactNode } from 'react';
import type { CVData } from '../types';

interface Props { cv: CVData; }

const C = {
  ink:      '#0b1220',
  inkSoft:  '#1f2937',
  inkMuted: '#374151',
  inkDim:   '#6b7280',
  rule:     '#cbd5e1',
  white:    '#ffffff',
};

function Bullets({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul style={{ marginTop: 6, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {lines.map((l, i) => (
        <li key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: C.inkSoft, listStyle: 'disc' }}>{l}</li>
      ))}
    </ul>
  );
}

export function ExecutiveTemplate({ cv }: Props) {
  const accent = cv.accentColor || '#0b1220';
  const { personal: p } = cv;

  return (
    <div className="cv-surface" style={{
      fontFamily: '"Fraunces", "Source Serif Pro", Georgia, serif',
      color: C.ink, background: C.white,
      padding: '50px 60px', minHeight: 1123,
    }}>
      {/* Header — double rules give the "executive" feel */}
      <header style={{ textAlign: 'center' }}>
        <div style={{ borderTop: `2px solid ${accent}`, borderBottom: `1px solid ${accent}`, padding: '14px 0', margin: '0 auto' }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.ink }}>
            {p.fullName || 'O teu nome'}
          </h1>
          {p.headline && (
            <p style={{ marginTop: 4, fontSize: 13, color: C.inkMuted, letterSpacing: '0.08em' }}>
              {p.headline}
            </p>
          )}
        </div>
        <div style={{
          marginTop: 12, fontSize: 11.5, color: C.inkDim,
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
        <Section title="Perfil" accent={accent}>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: C.inkSoft, whiteSpace: 'pre-wrap' }}>{cv.summary}</p>
        </Section>
      )}

      {cv.experience.length > 0 && (
        <Section title="Experiência" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {cv.experience.map((it) => (
              <div key={it.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink, letterSpacing: '0.02em' }}>{it.role || '—'}</div>
                  <div style={{ fontSize: 11.5, color: C.inkDim, letterSpacing: '0.04em' }}>
                    {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.inkMuted }}>
                  {it.company}{it.location ? ` · ${it.location}` : ''}
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
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{it.degree}</div>
                  <div style={{ fontSize: 11.5, color: C.inkDim }}>
                    {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.inkMuted }}>
                  {it.institution}{it.location ? `, ${it.location}` : ''}
                </div>
                {it.description && <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{it.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {cv.projects.length > 0 && (
        <Section title="Projetos relevantes" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cv.projects.map((proj) => (
              <div key={proj.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{proj.name}</div>
                  {proj.url && <div style={{ fontSize: 11.5, color: C.inkDim }}>{proj.url}</div>}
                </div>
                {proj.stack && <div style={{ fontSize: 11.5, color: C.inkDim, fontStyle: 'italic' }}>{proj.stack}</div>}
                {proj.description && <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{proj.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(cv.skills.length > 0 || cv.languages.length > 0) && (
        <Section title="Competências e idiomas" accent={accent}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {cv.skills.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cv.skills.map((g) => (
                  <div key={g.id} style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>
                    {g.category && <strong style={{ fontWeight: 600, color: C.ink }}>{g.category}: </strong>}
                    <span>{g.items}</span>
                  </div>
                ))}
              </div>
            )}
            {cv.languages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13, color: C.inkSoft }}>
                {cv.languages.map((l) => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.ink }}>{l.name}</span>
                    {l.level && <span style={{ color: C.inkDim, fontStyle: 'italic' }}>{l.level}</span>}
                  </div>
                ))}
              </div>
            )}
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
        fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.32em',
        fontWeight: 600, color: accent, marginBottom: 4,
      }}>{title}</h2>
      <div style={{ height: 1, width: '100%', background: accent, marginBottom: 10 }} />
      {children}
    </section>
  );
}
