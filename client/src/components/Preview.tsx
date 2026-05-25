/**
 * Live preview rendered while the user edits, and on the Paid screen
 * after payment.
 *
 * Composition:
 *   1. CV template (HTML/Tailwind, not the PDF renderer)
 *   2. One "framed certificate" preview page per attached certificate.
 *      The frame style follows the selected template (modern/classic/
 *      minimal/creative/executive), mirroring what the server outputs in
 *      the final PDF.
 *
 * Capture deterrents: no right-click, no text selection, no image drag.
 * Watermark on top while in builder/unpaid mode. None of this is real
 * security — the only paywall is /pdf/:sessionId server-side.
 *
 * Sizing: each "page" is 794 × 1123 px (A4 @ 96 dpi). Uses CSS `zoom`
 * (via .cv-page in index.css) so the layout footprint shrinks at smaller
 * viewports — no phantom horizontal scroll.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import type { CVData, CertificateItem, TemplateId } from '../types';
import { TEMPLATES } from '../templates';
import { dataUrlToBytes } from '../utils/certificate';
import { renderPdfThumbnail } from '../utils/pdfThumbnail';

interface Props {
  cv: CVData;
  refId?: string;
  paid?: boolean;
  /** Overrides the responsive CSS `zoom` on each page (inline beats the
   *  stylesheet). Used by the mobile preview modal to fit the page to the
   *  viewport width exactly. Omit to keep the .cv-page breakpoint zoom. */
  zoom?: number;
}

export function Preview({ cv, refId = 'cv-print-root', paid = false, zoom }: Props) {
  const Template = TEMPLATES[cv.template]?.component ?? TEMPLATES.modern.component;
  const certs = cv.certificates ?? [];
  const zoomStyle = zoom != null ? { zoom } : undefined;

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative inline-block"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div id={refId} className="cv-page" style={zoomStyle}>
          <Template cv={cv} />
        </div>
        {!paid && <WatermarkOverlay />}
      </div>

      {certs.length > 0 && (
        <div className="flex flex-col items-center gap-6">
          {certs.map((c) => (
            <CertificatePagePreview
              key={c.id}
              cert={c}
              template={cv.template}
              accent={cv.accentColor || '#98641f'}
              paid={paid}
              zoom={zoom}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Certificate "page" preview ───────────────────────────────────────
   `framed === false` falls back to a bare 1:1 thumbnail centred in a
   white page. Otherwise the layout is picked by template. */
function CertificatePagePreview({
  cert, template, accent, paid, zoom,
}: { cert: CertificateItem; template: TemplateId; accent: string; paid?: boolean; zoom?: number }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy,  setBusy]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    (async () => {
      const res = await renderPdfThumbnail(dataUrlToBytes(cert.pdfDataUrl));
      if (cancelled) return;
      setThumb(res?.dataUrl ?? null);
      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [cert.pdfDataUrl]);

  const framed = cert.framed !== false;

  return (
    <div
      className="cv-page relative inline-block"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', ...(zoom != null ? { zoom } : {}) }}
    >
      <div
        style={{
          width: 794,
          height: 1123,
          background: 'white',
          color: '#1a1410',
          boxShadow: 'var(--shadow-elevated)',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {!framed
          ? <BareFrame thumb={thumb} busy={busy} />
          : <TemplateFrame template={template} cert={cert} accent={accent} thumb={thumb} busy={busy} />}
      </div>
      {!paid && <WatermarkOverlay />}
    </div>
  );
}

/* ── Shared helpers ──────────────────────────────────────────────────── */

interface FrameProps {
  cert: CertificateItem;
  accent: string;
  thumb: string | null;
  busy: boolean;
}

function ThumbImg({ thumb, busy, style }: { thumb: string | null; busy: boolean; style?: CSSProperties }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      {thumb ? (
        <img
          src={thumb}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            border: '1px solid #d9d2c1',
            boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          }}
        />
      ) : busy ? (
        <span style={{ fontSize: 13, color: '#9a8a72' }}>A carregar pré-visualização…</span>
      ) : (
        <span style={{ fontSize: 13, color: '#9a8a72' }}>PDF</span>
      )}
    </div>
  );
}

function BareFrame({ thumb, busy }: { thumb: string | null; busy: boolean }) {
  return <div style={{ position: 'absolute', inset: 24 }}><ThumbImg thumb={thumb} busy={busy} /></div>;
}

/* ── Per-template frames ─────────────────────────────────────────────── */

function TemplateFrame({ template, cert, accent, thumb, busy }: FrameProps & { template: TemplateId }) {
  switch (template) {
    case 'classic':   return <ClassicFrame   cert={cert} accent={accent} thumb={thumb} busy={busy} />;
    case 'minimal':   return <MinimalFrame   cert={cert} accent={accent} thumb={thumb} busy={busy} />;
    case 'creative':  return <CreativeFrame  cert={cert} accent={accent} thumb={thumb} busy={busy} />;
    case 'executive': return <ExecutiveFrame cert={cert} accent={accent} thumb={thumb} busy={busy} />;
    case 'modern':
    case 'compact':
    default:          return <ModernFrame    cert={cert} accent={accent} thumb={thumb} busy={busy} />;
  }
}

/* Modern — sidebar accent strip + sans serif, like the CV's sidebar */
function ModernFrame({ cert, accent, thumb, busy }: FrameProps) {
  const SIDEBAR = 175;
  return (
    <>
      <aside style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: SIDEBAR,
        background: accent, color: 'white',
        padding: '40px 18px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ fontSize: 9, letterSpacing: '0.22em', opacity: 0.85, margin: 0, fontWeight: 700 }}>CERTIFICADO</p>
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: '10px 0 0 0', lineHeight: 1.2 }}>
          {cert.name || 'Certificado'}
        </h2>
        {cert.description && (
          <p style={{ fontSize: 11, marginTop: 10, opacity: 0.85, lineHeight: 1.45 }}>{cert.description}</p>
        )}
        <div style={{ marginTop: 'auto', fontSize: 10, opacity: 0.7, position: 'absolute', bottom: 24, left: 18, right: 18 }}>
          <p style={{ margin: 0 }}>CVeaver</p>
          <p style={{ margin: '2px 0 0 0' }}>{cert.pageCount} {cert.pageCount === 1 ? 'pág.' : 'págs.'}</p>
        </div>
      </aside>
      <main style={{ position: 'absolute', top: 0, bottom: 0, left: SIDEBAR, right: 0, padding: 36 }}>
        <ThumbImg thumb={thumb} busy={busy} />
      </main>
    </>
  );
}

/* Classic — centered serif header with a double rule below */
function ClassicFrame({ cert, accent, thumb, busy }: FrameProps) {
  return (
    <>
      <header style={{
        padding: '48px 64px 16px', textAlign: 'center',
        fontFamily: '"Fraunces", Georgia, serif',
      }}>
        <p style={{ fontSize: 10, letterSpacing: '0.32em', color: accent, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
          Certificado
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1a1410', margin: '12px 0 6px 0', lineHeight: 1.15 }}>
          {cert.name || 'Certificado'}
        </h2>
        {cert.description && (
          <p style={{ fontSize: 13, fontStyle: 'italic', color: '#5a4a36', margin: 0 }}>{cert.description}</p>
        )}
        <div style={{ borderTop: `1.5px solid ${accent}`, marginTop: 22 }} />
        <div style={{ borderTop: `0.5px solid ${accent}`, marginTop: 3, opacity: 0.7 }} />
      </header>
      <main style={{ position: 'absolute', top: 200, bottom: 70, left: 64, right: 64 }}>
        <ThumbImg thumb={thumb} busy={busy} />
      </main>
      <footer style={{
        position: 'absolute', bottom: 24, left: 64, right: 64,
        textAlign: 'center', fontSize: 10, color: '#806743',
        fontFamily: '"Fraunces", Georgia, serif',
      }}>
        cveaver.com · {cert.pageCount} {cert.pageCount === 1 ? 'pág.' : 'págs.'}
      </footer>
    </>
  );
}

/* Minimal — hairline rule and generous whitespace */
function MinimalFrame({ cert, accent, thumb, busy }: FrameProps) {
  return (
    <>
      <header style={{
        padding: '48px 56px 14px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ fontSize: 9.5, letterSpacing: '0.30em', color: '#5a4a36', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>
          Anexo · Certificado
        </p>
        <h2 style={{
          fontSize: 22, fontWeight: 600, color: '#1a1410',
          margin: '10px 0 4px 0', lineHeight: 1.15,
          fontFamily: '"Fraunces", Georgia, serif',
        }}>
          {cert.name || 'Certificado'}
        </h2>
        {cert.description && (
          <p style={{ fontSize: 12, color: '#7a6b54', margin: 0, lineHeight: 1.5 }}>{cert.description}</p>
        )}
        <div style={{ height: 1.5, width: 36, background: accent, marginTop: 14 }} />
      </header>
      <main style={{ position: 'absolute', top: 170, bottom: 56, left: 56, right: 56 }}>
        <ThumbImg thumb={thumb} busy={busy} />
      </main>
      <footer style={{
        position: 'absolute', bottom: 20, left: 56, right: 56,
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#806743',
        fontFamily: 'Inter, sans-serif',
      }}>
        <span>cveaver.com</span>
        <span>{cert.pageCount} {cert.pageCount === 1 ? 'pág.' : 'págs.'}</span>
      </footer>
    </>
  );
}

/* Creative — bold coloured header block, white text */
function CreativeFrame({ cert, accent, thumb, busy }: FrameProps) {
  return (
    <>
      <header style={{
        background: accent, color: 'white',
        padding: '36px 56px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ fontSize: 10, letterSpacing: '0.22em', opacity: 0.85, margin: 0, fontWeight: 700 }}>
          CERTIFICADO
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 4px 0', lineHeight: 1.1 }}>
          {cert.name || 'Certificado'}
        </h2>
        {cert.description && (
          <p style={{ fontSize: 13, opacity: 0.9, margin: 0, lineHeight: 1.4 }}>{cert.description}</p>
        )}
      </header>
      <main style={{ position: 'absolute', top: 165, bottom: 65, left: 56, right: 56 }}>
        <ThumbImg thumb={thumb} busy={busy} />
      </main>
      <footer style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: accent, color: 'white',
        padding: '12px 56px',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
      }}>
        <span>cveaver.com</span>
        <span>{cert.pageCount} {cert.pageCount === 1 ? 'pág.' : 'págs.'}</span>
      </footer>
    </>
  );
}

/* Executive — premium serif with double rules top and bottom */
function ExecutiveFrame({ cert, accent, thumb, busy }: FrameProps) {
  return (
    <>
      <header style={{
        padding: '52px 64px 18px', textAlign: 'center',
        fontFamily: '"Fraunces", Georgia, serif',
      }}>
        <div style={{ borderTop: `2px solid ${accent}`, marginBottom: 4 }} />
        <div style={{ borderTop: `0.7px solid ${accent}`, opacity: 0.65, marginBottom: 18 }} />
        <p style={{ fontSize: 10, letterSpacing: '0.4em', color: accent, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
          Certificado
        </p>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1a1410', margin: '12px 0 6px 0', letterSpacing: '-0.005em', lineHeight: 1.1 }}>
          {cert.name || 'Certificado'}
        </h2>
        {cert.description && (
          <p style={{ fontSize: 13, fontStyle: 'italic', color: '#5a4a36', margin: 0 }}>{cert.description}</p>
        )}
      </header>
      <main style={{ position: 'absolute', top: 210, bottom: 80, left: 64, right: 64 }}>
        <ThumbImg thumb={thumb} busy={busy} />
      </main>
      <footer style={{
        position: 'absolute', bottom: 28, left: 64, right: 64,
        textAlign: 'center', fontFamily: '"Fraunces", Georgia, serif',
      }}>
        <div style={{ borderTop: `0.7px solid ${accent}`, opacity: 0.65, marginBottom: 4 }} />
        <div style={{ borderTop: `2px solid ${accent}`, marginBottom: 10 }} />
        <p style={{ fontSize: 10, color: '#806743', margin: 0 }}>
          cveaver.com · {cert.pageCount} {cert.pageCount === 1 ? 'pág.' : 'págs.'}
        </p>
      </footer>
    </>
  );
}

/* ── Watermark ───────────────────────────────────────────────────────── */
function WatermarkOverlay() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="cveaver-watermark" x="0" y="0" width="280" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <text x="0" y="40"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="rgba(152, 100, 31, 0.22)"
            letterSpacing="6"
          >
            CVeaver · PREVIEW
          </text>
          <text x="40" y="110"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="14"
            fontWeight="500"
            fill="rgba(83, 138, 76, 0.20)"
            letterSpacing="4"
          >
            NOT PAID · cveaver.com
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cveaver-watermark)" />
    </svg>
  );
}
