import type { CVData } from '../types';
import { TEMPLATES } from '../templates';

interface Props {
  cv: CVData;
  /** id of the DOM node we'll snapshot for PDF generation later */
  refId?: string;
}

export function Preview({ cv, refId = 'cv-print-root' }: Props) {
  const Template = TEMPLATES[cv.template]?.component ?? TEMPLATES.modern.component;
  return (
    <div className="flex justify-center">
      <div id={refId} className="w-[794px] origin-top scale-[0.78] sm:scale-[0.86] lg:scale-100 transition-transform">
        <Template cv={cv} />
      </div>
    </div>
  );
}
