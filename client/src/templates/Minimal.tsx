import type { ReactNode } from 'react';
import type { CVData } from '../types';
import { labelsForLocale } from '../utils/cvLabels';
import { useT } from '../i18n';

interface Props { cv: CVData; }

const C = {
  ink:      '#0f172a',
  inkSoft:  '#334155',
  inkMuted: '#475569',
  inkDim:   '#64748b',
  inkFaint: '#94a3b8',
  rule:     '#e2e8f0',
  white:    '#ffffff',
};

function Lines({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((l, i) => (
        <p key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: C.inkSoft }}>{l}</p>
      ))}
    </div>
  );
}

export function MinimalTemplate({ cv }: Props) {
  const accent = cv.accentColor || '#0f172a';
  const { personal: p } = cv;
  const { locale } = useT();
  const SEC = labelsForLocale(cv.locale ?? locale).sections;

  return (
    <div className="cv-surface" style={{
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      color: C.ink, background: C.white,
      padding: '60px 64px', minHeight: 1123,
    }}>
      <header style={{ marginBottom: 36 }}>
        <h1 style={{
          fontSize: 38, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.05, color: C.ink,
        }}>{p.fullName || 'O teu nome'}</h1>
        {p.headline && (
          <p style={{ marginTop: 6, fontSize: 14, color: C.inkMuted, letterSpacing: '0.02em' }}>{p.headline}</p>
        )}
        <div style={{ marginTop: 16, height: 2, width: 48, background: accent }} />
        <div style={{
          marginTop: 18, fontSize: 11.5, color: C.inkDim,
          display: 'flex', flexWrap: 'wrap', gap: '4px 22px',
        }}>
          {p.email    && <span>{p.email}</span>}
          {p.phone    && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
          {p.website  && <span>{p.website}</span>}
          {p.linkedin && <span>{p.linkedin}</span>}
          {p.github   && <span>{p.github}</span>}
        </div>
      </header>

      {cv.summary && (
        <Block title="Sobre" accent={accent}>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: C.inkSoft, whiteSpace: 'pre-wrap', maxWidth: 600 }}>
            {cv.summary}
          </p>
        </Block>
      )}

      {cv.experience.length > 0 && (
        <Block title={SEC.experience} accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {cv.experience.map((it) => (
              <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 18 }}>
                <div style={{ fontSize: 11.5, color: C.inkFaint, paddingTop: 2 }}>
                  {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>{it.role || '—'}</div>
                  <div style={{ fontSize: 12.5, color: C.inkMuted }}>
                    {it.company}{it.location ? ` · ${it.location}` : ''}
                  </div>
                  <Lines text={it.description} />
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {cv.projects.length > 0 && (
        <Block title={SEC.projects} accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cv.projects.map((proj) => (
              <div key={proj.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 18 }}>
                <div style={{ fontSize: 11.5, color: C.inkFaint, paddingTop: 2 }}>{proj.stack || ' '}</div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>{proj.name}</div>
                    {proj.url && <div style={{ fontSize: 11.5, color: C.inkFaint }}>{proj.url}</div>}
                  </div>
                  {proj.description && <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, lineHeight: 1.55 }}>{proj.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {cv.education.length > 0 && (
        <Block title={SEC.education} accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cv.education.map((it) => (
              <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 18 }}>
                <div style={{ fontSize: 11.5, color: C.inkFaint, paddingTop: 2 }}>
                  {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>{it.degree}</div>
                  <div style={{ fontSize: 12.5, color: C.inkMuted }}>
                    {it.institution}{it.location ? ` · ${it.location}` : ''}
                  </div>
                  {it.description && <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, lineHeight: 1.55 }}>{it.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {(cv.skills.length > 0 || cv.languages.length > 0) && (
        <Block title="Detalhes" accent={accent}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            {cv.skills.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cv.skills.map((g) => (
                  <div key={g.id} style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
                    {g.category && <span style={{ color: C.inkFaint }}>{g.category}: </span>}
                    {g.items}
                  </div>
                ))}
              </div>
            )}
            {cv.languages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cv.languages.map((l) => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.inkSoft }}>
                    <span>{l.name}</span>
                    <span style={{ color: C.inkFaint }}>{l.level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Block>
      )}
    </div>
  );
}

function Block({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <h2 style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
        fontWeight: 500, color: accent, marginBottom: 14,
      }}>{title}</h2>
      {children}
    </section>
  );
}
