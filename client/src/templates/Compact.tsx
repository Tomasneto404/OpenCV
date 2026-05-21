/**
 * Compact — placeholder for an upcoming template.
 *
 * Visible on the picker as "Em breve" / "Coming soon"; cannot be selected for
 * PDF generation. Marked as `available: false` in templates/index.ts.
 *
 * Keep this file alive so the picker has a real component to render in the
 * preview area while the user hovers over the chip.
 */
import type { CVData } from '../types';

interface Props { cv: CVData; }

export function CompactTemplate({ cv }: Props) {
  return (
    <div className="cv-surface" style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '60px 64px',
      minHeight: 1123,
      background: 'linear-gradient(180deg, #fafaf7 0%, #f1f5f9 100%)',
      color: '#0f172a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', gap: 20,
    }}>
      <div style={{
        width: 90, height: 90, borderRadius: '999px',
        background: 'rgba(139, 92, 246, 0.15)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        display: 'grid', placeItems: 'center', fontSize: 36,
      }}>⋯</div>
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Fraunces, serif' }}>Compact</h2>
        <p style={{ marginTop: 8, fontSize: 14, color: '#475569' }}>
          Em breve · Coming soon · Próximamente · Bientôt · Demnächst
        </p>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 420 }}>
        Template ultra-compacto, single-page, denso e ATS-friendly. Volta em breve.
      </p>
      <p style={{ fontSize: 11, color: '#94a3b8' }}>
        {cv.personal.fullName ? `Esta pré-visualização ignora o conteúdo actual (${cv.personal.fullName.split(' ')[0]}).` : '—'}
      </p>
    </div>
  );
}
