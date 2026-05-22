/**
 * Live preview rendered while the user edits. Wrapped in a watermark + a
 * couple of casual capture deterrents (no right-click, no text selection,
 * no image drag). These are **fricção, não segurança** — a determined user
 * still can OS-screenshot. The real paywall is server-side at /pdf/:sessionId
 * which only returns the rendered file when Stripe confirms payment.
 *
 * Passing `paid` hides the watermark (used by the Paid screen after the
 * user has actually paid — they're entitled to see a clean preview).
 */
import type { CVData } from '../types';
import { TEMPLATES } from '../templates';

interface Props {
  cv: CVData;
  /** id of the DOM node we'll snapshot for PDF generation later */
  refId?: string;
  /** If true, hide the "PREVIEW" watermark. Defaults to false. */
  paid?: boolean;
}

export function Preview({ cv, refId = 'cv-print-root', paid = false }: Props) {
  const Template = TEMPLATES[cv.template]?.component ?? TEMPLATES.modern.component;
  return (
    <div className="flex justify-center">
      <div
        className="relative"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div id={refId} className="w-[794px] origin-top scale-[0.78] sm:scale-[0.86] lg:scale-100 transition-transform">
          <Template cv={cv} />
        </div>

        {!paid && <WatermarkOverlay />}
      </div>
    </div>
  );
}

/**
 * Tiled diagonal watermark over the preview. Sits absolute, pointer-events
 * none so it doesn't break interaction. Built as an inline SVG so it scales
 * with the underlying CV and survives DOM re-renders.
 *
 * Yes, it can be removed from the DOM via DevTools. The point is to make
 * casual screenshot capture commercially useless (no recruiter will accept
 * a CV with "PREVIEW" stamped across it), not to be unbypassable.
 */
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
            fill="rgba(156, 106, 51, 0.22)"
            letterSpacing="6"
          >
            CVeaver · PREVIEW
          </text>
          <text x="40" y="110"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="14"
            fontWeight="500"
            fill="rgba(77, 138, 69, 0.20)"
            letterSpacing="4"
          >
            NOT PAID · cveaver.app
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cveaver-watermark)" />
    </svg>
  );
}
