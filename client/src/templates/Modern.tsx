import type { CSSProperties, ReactNode } from 'react';
import type { CVData } from '../types';
import { labelsForLocale } from '../utils/cvLabels';
import { useT } from '../i18n';

interface Props { cv: CVData; }

/* Palette in pure sRGB so html2canvas can serialise it.
   Tailwind v4 emits color-mix(in oklab, ...) for opacity utilities, which
   html2canvas does not understand — we use rgba() literals instead. */
const C = {
  ink:        '#111827',
  inkSoft:    '#374151',
  inkMuted:   '#4b5563',
  inkDim:     '#6b7280',
  inkFaint:   '#9ca3af',
  white:      '#ffffff',
  whiteSoft:  'rgba(255,255,255,0.85)',
  whiteMute:  'rgba(255,255,255,0.75)',
  whiteDim:   'rgba(255,255,255,0.62)',
  whiteFill:  'rgba(255,255,255,0.16)',
  whiteRing:  'rgba(255,255,255,0.3)',
};

const initials = (full: string) =>
  full.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';

function Bullets({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((l, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.45, color: C.inkSoft }}>
          <span style={{ color: C.inkFaint, userSelect: 'none' }}>•</span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

export function ModernTemplate({ cv }: Props) {
  const accent = cv.accentColor || '#6366f1';
  const { personal: p } = cv;
  const { locale } = useT();
  const L = labelsForLocale(cv.locale ?? locale);
  const SEC = L.sections;
  const CL  = L.contactLabels;

  const rootStyle: CSSProperties = {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    color: C.ink,
    background: C.white,
  };

  return (
    <div className="cv-surface" style={rootStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 1123 }}>
        {/* Sidebar */}
        <aside style={{ background: accent, color: C.white, padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {p.photoDataUrl ? (
              <img
                src={p.photoDataUrl}
                alt=""
                style={{
                  height: 112, width: 112, borderRadius: '50%',
                  objectFit: 'cover',
                  boxShadow: `0 0 0 4px ${C.whiteRing}`,
                }}
              />
            ) : (
              <div style={{
                height: 112, width: 112, borderRadius: '50%',
                background: C.whiteFill,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700,
                boxShadow: `0 0 0 4px ${C.whiteRing}`,
              }}>{initials(p.fullName)}</div>
            )}
            <h1 style={{ marginTop: 14, fontSize: 20, fontWeight: 700, lineHeight: 1.15 }}>
              {p.fullName || 'O teu nome'}
            </h1>
            <p style={{ fontSize: 13, color: C.whiteSoft, marginTop: 2 }}>
              {p.headline || 'Título profissional'}
            </p>
          </div>

          <Section title={SEC.contact}>
            {p.email    && <Row label={CL.email}    value={p.email} />}
            {p.phone    && <Row label={CL.phone}    value={p.phone} />}
            {p.location && <Row label={CL.location} value={p.location} />}
            {p.website  && <Row label={CL.website}  value={p.website} />}
            {p.linkedin && <Row label={CL.linkedin} value={p.linkedin} />}
            {p.github   && <Row label={CL.github}   value={p.github} />}
          </Section>

          {cv.skills.length > 0 && (
            <Section title={SEC.skills}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cv.skills.map((g) => (
                  <div key={g.id}>
                    {g.category && (
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.whiteMute, marginBottom: 4 }}>
                        {g.category}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {g.items.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                        <span key={i} style={{
                          fontSize: 11,
                          background: C.whiteFill,
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {cv.languages.length > 0 && (
            <Section title={SEC.languages}>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cv.languages.map((l) => (
                  <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span>{l.name}</span>
                    <span style={{ color: C.whiteMute }}>{l.level}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </aside>

        {/* Main */}
        <main style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {cv.summary && (
            <Block title={SEC.about} accent={accent}>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: C.inkSoft, whiteSpace: 'pre-wrap' }}>{cv.summary}</p>
            </Block>
          )}

          {cv.experience.length > 0 && (
            <Block title={SEC.experience} accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {cv.experience.map((it) => (
                  <div key={it.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: C.ink, fontSize: 13.5 }}>{it.role || '—'}</div>
                        <div style={{ fontSize: 12.5, color: C.inkMuted }}>
                          {it.company}{it.location ? ` · ${it.location}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.inkDim, whiteSpace: 'nowrap' }}>
                        {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                      </div>
                    </div>
                    <Bullets text={it.description} />
                  </div>
                ))}
              </div>
            </Block>
          )}

          {cv.projects.length > 0 && (
            <Block title={SEC.projects} accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cv.projects.map((proj) => (
                  <div key={proj.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600, color: C.ink, fontSize: 13.5 }}>{proj.name}</div>
                      {proj.url && <div style={{ fontSize: 11.5, color: C.inkDim }}>{proj.url}</div>}
                    </div>
                    {proj.stack && <div style={{ fontSize: 11.5, color: C.inkDim }}>{proj.stack}</div>}
                    {proj.description && (
                      <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Block>
          )}

          {cv.education.length > 0 && (
            <Block title={SEC.education} accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cv.education.map((it) => (
                  <div key={it.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: C.ink, fontSize: 13.5 }}>{it.degree}</div>
                        <div style={{ fontSize: 12.5, color: C.inkMuted }}>
                          {it.institution}{it.location ? ` · ${it.location}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.inkDim, whiteSpace: 'nowrap' }}>
                        {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                      </div>
                    </div>
                    {it.description && (
                      <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{it.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Block>
          )}
        </main>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em',
        fontWeight: 600, color: C.whiteSoft, marginBottom: 8,
      }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 12, marginBottom: 4 }}>
      <div style={{ fontSize: 10.5, color: C.whiteDim, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function Block({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em',
        fontWeight: 600, marginBottom: 10, color: accent,
      }}>{title}</h2>
      <div style={{ height: 1, width: '100%', marginBottom: 12, background: accent + '33' }} />
      {children}
    </section>
  );
}
