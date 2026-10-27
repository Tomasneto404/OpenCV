import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CVData, CertificateItem, TemplateId } from '../types';
import { TEMPLATES } from '../templates';
import { dataUrlToBytes } from '../utils/certificate';
import { renderPdfThumbnail } from '../utils/pdfThumbnail';

/** Match the values in index.css `.cv-page-frame` exactly. */
const PAGE_W = 794;
const PAGE_H = 1123;
/** Top + bottom safe-area inside each A4 frame. Mimics the typical PDF
 *  page margin (~6 mm @ 96 dpi) — text never crashes into the sheet edge. */
const SAFE = 28;
/** Visual gap between stacked A4 sheets, in px (pre-zoom). */
const PAGE_GAP = 24;

interface Props {
  cv: CVData;
  /** Overrides the responsive CSS `zoom` on each page (inline beats the
   *  stylesheet). Used by the mobile preview modal to fit the page to the
   *  viewport width exactly. Omit to keep the .cv-page breakpoint zoom. */
  zoom?: number;
}

export function Preview({ cv, zoom }: Props) {
  const entry = TEMPLATES[cv.template] ?? TEMPLATES.modern;
  const Template = entry.component;
  const certs = cv.certificates ?? [];

  return (
    <div className="flex flex-col items-center gap-6">
      <PaginatedCanvas
        zoom={zoom}
        sidebarEnd={entry.sidebarEnd ?? 0}
        surfaceBg={entry.surfaceBg ?? '#ffffff'}
        accent={cv.accentColor || '#6366f1'}
      >
        <Template cv={cv} />
      </PaginatedCanvas>

      {certs.length > 0 && certs.map((c) => (
        <CertificatePagePreview
          key={c.id}
          cert={c}
          template={cv.template}
          accent={cv.accentColor || '#98641f'}
            zoom={zoom}
        />
      ))}
    </div>
  );
}

/**
 * Collects the vertical extent of every visual text line + replaced element
 * (img/svg) inside `root`, in coordinates relative to root's top. Using
 * Range.getClientRects() yields one rect per WRAPPED LINE, so the paginator
 * can break between lines of a paragraph without ever cutting through one.
 * Overlapping rects (e.g. a sidebar line and a main-column line at the same
 * y) are merged into occupied intervals.
 */
function measureOccupied(root: HTMLElement): { contentH: number; intervals: [number, number][] } {
  const originTop = root.getBoundingClientRect().top;
  const rects: [number, number][] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent && node.textContent.trim().length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const range = document.createRange();
  let node: Node | null;
  while ((node = walker.nextNode())) {
    range.selectNodeContents(node);
    const list = range.getClientRects();
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.height > 0) rects.push([r.top - originTop, r.bottom - originTop]);
    }
  }
  // Replaced / atomic elements that carry no text node but must not split.
  root.querySelectorAll('img, svg').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0) rects.push([r.top - originTop, r.bottom - originTop]);
  });

  rects.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [t, b] of rects) {
    const last = merged[merged.length - 1];
    if (last && t <= last[1] + 1) last[1] = Math.max(last[1], b);
    else merged.push([t, b]);
  }
  return { contentH: root.scrollHeight, intervals: merged };
}

/**
 * Greedy page breaks. Each break lands in a gap between occupied intervals
 * so no line is ever cut. Page 0 has only a bottom margin (its top keeps the
 * template's natural padding); subsequent pages have top + bottom margins.
 * A block taller than a full page is the only case that forces a hard cut.
 *
 * Returns boundary offsets [0, b1, b2, …, contentH]; page i spans
 * [breaks[i], breaks[i+1]].
 */
function computeBreaks(contentH: number, intervals: [number, number][]): number[] {
  const firstCap = PAGE_H - SAFE;
  const restCap = PAGE_H - 2 * SAFE;
  const breaks = [0];

  for (let guard = 0; guard < 60; guard++) {
    const start = breaks[breaks.length - 1];
    const cap = breaks.length === 1 ? firstCap : restCap;
    const maxY = start + cap;
    if (maxY >= contentH) break; // remaining content fits on this last page

    let y = maxY;
    // If maxY falls strictly inside a line/element, break before it.
    const straddle = intervals.find((iv) => iv[0] < maxY && maxY < iv[1]);
    if (straddle) y = straddle[0] > start ? straddle[0] : maxY; // else: too tall → hard cut
    if (y <= start) y = maxY; // guarantee forward progress
    breaks.push(y);
  }
  breaks.push(contentH);
  return breaks;
}

/**
 * Wraps `children` in stacked A4 frames. Page breaks are computed from the
 * measured line positions (see computeBreaks), so a line is never split
 * across a page boundary. Each frame slices the single rendered content via
 * a negative marginTop; safe-area strips hide the neighbouring page's bleed
 * into the margins and are painted in the page colours (surface + sidebar
 * accent) so full-bleed templates stay edge-to-edge and off-white surfaces
 * don't flash white bands.
 *
 * Sidebar extension: the inner wrapper publishes `--cv-stack-h` so the
 * template's full-bleed background (cv-surface, Modern's grid) fills the
 * entire multi-page span; the accent then reaches the bottom of every sheet.
 */
function PaginatedCanvas({
  children, zoom, sidebarEnd = 0, surfaceBg = '#ffffff', accent = '#6366f1',
}: {
  children: ReactNode;
  zoom?: number;
  sidebarEnd?: number;
  surfaceBg?: string;
  accent?: string;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [breaks, setBreaks] = useState<number[]>([0, PAGE_H]);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const recompute = () => {
      const { contentH, intervals } = measureOccupied(el);
      const next = computeBreaks(contentH, intervals);
      setBreaks((prev) =>
        prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 0.5)
          ? prev
          : next,
      );
    };

    recompute();
    const obs = new ResizeObserver(recompute);
    obs.observe(el);
    return () => obs.disconnect();
  }, [children]);

  const zoomStyle: CSSProperties | undefined = zoom != null ? { zoom } : undefined;
  const pageCount = Math.max(1, breaks.length - 1);
  /** Tall enough that the full-bleed background covers every frame fully. */
  const stackH = pageCount * PAGE_H;

  /** Bottom-of-content / top-of-frame margin strip. `top`/`height` in px. */
  const Strip = ({ top, height }: { top: number; height: number }) =>
    height <= 0 ? null : (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, top, height,
          display: 'flex', zIndex: 1, pointerEvents: 'none',
        }}
      >
        {sidebarEnd > 0 && <div style={{ width: sidebarEnd, background: accent }} />}
        <div style={{ flex: 1, background: surfaceBg }} />
      </div>
    );

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden measurement layer — same 794 px width as a real frame, but
          OUTSIDE the zoomed .cv-page so CSS `zoom` never scales the measured
          line rects (getClientRects is zoom-sensitive, scrollHeight is not —
          measuring here keeps both in the same unscaled coordinate space).
          No `--cv-stack-h`, so cv-surface keeps its natural content height.
          A zero-size clipped wrapper prevents the unscaled measurement copy
          from extending the scroll area beyond the visible, zoomed pages. */}
      <div
        aria-hidden="true"
        style={{
          width: 0,
          height: 0,
          overflow: 'hidden',
          position: 'absolute',
          left: 0,
          top: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div ref={measureRef} style={{ width: PAGE_W }}>
          {children}
        </div>
      </div>

      <div className="cv-page flex flex-col items-center" style={{ ...zoomStyle, gap: PAGE_GAP }}>
        {Array.from({ length: pageCount }, (_, i) => {
          const start = breaks[i];
          const end = breaks[i + 1] ?? start + PAGE_H;
          const topMargin = i === 0 ? 0 : SAFE;
          const contentShown = end - start;
          const contentBottom = topMargin + contentShown;
          return (
            <div
              key={i}
              className="cv-page-frame"
              style={{ background: surfaceBg }}
            >
              {/* Inner wrapper: positions the slice and publishes --cv-stack-h
                  so the template's full-bleed background fills the whole stack. */}
              <div
                style={{
                  marginTop: topMargin - start,
                  ['--cv-stack-h' as string]: `${stackH}px`,
                } as CSSProperties}
              >
                {children}
              </div>
              {/* Top safe area — only on inner pages (page 0 keeps its
                  natural top). Hides the previous page's bleed. */}
              {i > 0 && <Strip top={0} height={SAFE} />}
              {/* Bottom safe area — from where this page's content ends to
                  the frame bottom. Hides the next page's bleed and renders
                  the page's trailing whitespace (sidebar accent + surface).
                  Skipped on the last page (content simply ends there). */}
              {i < pageCount - 1 && <Strip top={contentBottom} height={PAGE_H - contentBottom} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Certificate "page" preview ───────────────────────────────────────
   `framed === false` falls back to a bare 1:1 thumbnail centred in a
   white page. Otherwise the layout is picked by template. */
function CertificatePagePreview({
  cert, template, accent, zoom,
}: { cert: CertificateItem; template: TemplateId; accent: string; zoom?: number }) {
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
      className="cv-page"
      style={zoom != null ? { zoom } : undefined}
    >
      <div
        className="cv-page-frame"
        style={{ color: '#1a1410' }}
      >
        {!framed
          ? <BareFrame thumb={thumb} busy={busy} />
          : <TemplateFrame template={template} cert={cert} accent={accent} thumb={thumb} busy={busy} />}
      </div>
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
    case 'compact':
    case 'studio':
    case 'technical':
    case 'academic':
    case 'minimal':   return <MinimalFrame   cert={cert} accent={accent} thumb={thumb} busy={busy} />;
    case 'creative':  return <CreativeFrame  cert={cert} accent={accent} thumb={thumb} busy={busy} />;
    case 'executive': return <ExecutiveFrame cert={cert} accent={accent} thumb={thumb} busy={busy} />;
    case 'modern':
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
          <p style={{ margin: 0 }}>OpenCV</p>
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
        OpenCV · {cert.pageCount} {cert.pageCount === 1 ? 'pág.' : 'págs.'}
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
        <span>OpenCV</span>
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
        <span>OpenCV</span>
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
          OpenCV · {cert.pageCount} {cert.pageCount === 1 ? 'pág.' : 'págs.'}
        </p>
      </footer>
    </>
  );
}
