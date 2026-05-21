import type { ReactNode } from 'react';
import type { CVData } from '../types';

interface Props { cv: CVData; }

const C = {
  ink:      '#111827',
  inkSoft:  '#1f2937',
  inkMuted: '#374151',
  inkDim:   '#4b5563',
  inkFaint: '#9ca3af',
  white:    '#ffffff',
  surface:  '#fafaf7',
};

/* Tint helpers — pure sRGB so html2canvas can serialise. */
function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Bullets({ text, accent }: { text: string; accent: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((l, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: C.inkSoft }}>
          <span style={{ color: accent, fontWeight: 700, userSelect: 'none' }}>▹</span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

export function CreativeTemplate({ cv }: Props) {
  const accent = cv.accentColor || '#a855f7';
  const { personal: p } = cv;
  const initials = p.fullName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join('') || '·';

  return (
    <div className="cv-surface" style={{
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      color: C.ink, background: C.surface,
      minHeight: 1123,
    }}>
      {/* Header band */}
      <header style={{
        position: 'relative',
        padding: '40px 52px 36px',
        background: `linear-gradient(135deg, ${withAlpha(accent, 0.18)} 0%, ${withAlpha(accent, 0.04)} 100%)`,
        borderBottom: `1px solid ${withAlpha(accent, 0.22)}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {p.photoDataUrl ? (
            <img src={p.photoDataUrl} alt="" style={{
              height: 96, width: 96, borderRadius: '50%', objectFit: 'cover',
              boxShadow: `0 0 0 3px ${C.white}, 0 0 0 6px ${accent}`,
            }} />
          ) : (
            <div style={{
              height: 96, width: 96, borderRadius: '50%',
              background: accent, color: C.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 700,
              boxShadow: `0 0 0 3px ${C.white}, 0 0 0 6px ${accent}`,
              fontFamily: '"Fraunces", serif',
            }}>{initials}</div>
          )}
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: accent, fontWeight: 600, marginBottom: 4 }}>
              Curriculum
            </div>
            <h1 style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 36, fontWeight: 600, lineHeight: 1.05, color: C.ink, letterSpacing: '-0.01em',
            }}>{p.fullName || 'O teu nome'}</h1>
            {p.headline && (
              <p style={{ fontSize: 14, color: C.inkDim, marginTop: 4 }}>{p.headline}</p>
            )}
          </div>
        </div>

        <div style={{
          marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: '6px 18px',
          fontSize: 11.5, color: C.inkMuted,
        }}>
          {[p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean).map((v, i) => (
            <span key={i} style={{
              padding: '4px 10px', borderRadius: 999,
              background: C.white, border: `1px solid ${withAlpha(accent, 0.25)}`,
            }}>{v}</span>
          ))}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 36, padding: '32px 52px 48px' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {cv.summary && (
            <Block title="Sobre" accent={accent}>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: C.inkSoft, whiteSpace: 'pre-wrap' }}>{cv.summary}</p>
            </Block>
          )}

          {cv.experience.length > 0 && (
            <Block title="Experiência" accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cv.experience.map((it) => (
                  <div key={it.id} style={{
                    paddingLeft: 14, borderLeft: `2px solid ${withAlpha(accent, 0.35)}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: C.ink, fontSize: 14 }}>{it.role || '—'}</div>
                        <div style={{ fontSize: 12.5, color: accent, fontWeight: 500 }}>
                          {it.company}{it.location ? ` · ${it.location}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.inkDim, whiteSpace: 'nowrap' }}>
                        {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                      </div>
                    </div>
                    <Bullets text={it.description} accent={accent} />
                  </div>
                ))}
              </div>
            </Block>
          )}

          {cv.projects.length > 0 && (
            <Block title="Projetos" accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cv.projects.map((proj) => (
                  <div key={proj.id} style={{
                    padding: 12, borderRadius: 10,
                    background: C.white,
                    border: `1px solid ${withAlpha(accent, 0.18)}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600, color: C.ink, fontSize: 13.5 }}>{proj.name}</div>
                      {proj.url && <div style={{ fontSize: 11.5, color: accent }}>{proj.url}</div>}
                    </div>
                    {proj.stack && <div style={{ fontSize: 11.5, color: C.inkDim, marginTop: 2 }}>{proj.stack}</div>}
                    {proj.description && <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{proj.description}</p>}
                  </div>
                ))}
              </div>
            </Block>
          )}
        </div>

        {/* Aside */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {cv.skills.length > 0 && (
            <Block title="Competências" accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cv.skills.map((g) => (
                  <div key={g.id}>
                    {g.category && (
                      <div style={{ fontSize: 11, color: accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {g.category}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.items.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 4,
                          background: withAlpha(accent, 0.1),
                          color: C.inkSoft,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {cv.education.length > 0 && (
            <Block title="Formação" accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cv.education.map((it) => (
                  <div key={it.id}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: C.ink }}>{it.degree}</div>
                    <div style={{ fontSize: 11.5, color: accent }}>{it.institution}</div>
                    <div style={{ fontSize: 11, color: C.inkDim }}>
                      {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {cv.languages.length > 0 && (
            <Block title="Idiomas" accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cv.languages.map((l) => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.inkSoft }}>
                    <span>{l.name}</span>
                    <span style={{ color: C.inkDim }}>{l.level}</span>
                  </div>
                ))}
              </div>
            </Block>
          )}
        </aside>
      </div>
    </div>
  );
}

function Block({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.28em',
        fontWeight: 700, color: accent, marginBottom: 10,
      }}>{title}</h2>
      {children}
    </section>
  );
}
